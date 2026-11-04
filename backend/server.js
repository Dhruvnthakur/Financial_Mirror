const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const {
  normalizeTransactions,
  parseTextToTransactions,
  buildMetrics,
  generatePersonality,
  generateInsights,
  generateActions,
  generateNudge,
} = require("./utils");

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// Helper: Get session or 404
function getSessionOr404(sessionId) {
  const stmt = db.prepare("SELECT * FROM sessions WHERE id = ?");
  const session = stmt.get(sessionId);
  if (!session) return null;
  const txStmt = db.prepare("SELECT date, description, amount, type, category FROM transactions WHERE session_id = ?");
  const transactions = txStmt.all(sessionId);
  return { ...session, transactions };
}

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "Financial Mirror API (Express + SQLite)",
    status: "ok",
    privacy: "persistent database storage (SQLite)",
  });
});

// Start session
app.post("/sessions/start", (req, res) => {
  const { profile } = req.body;
  const sessionId = uuidv4();
  const stmt = db.prepare("INSERT INTO sessions (id, profile) VALUES (?, ?)");
  stmt.run(sessionId, JSON.stringify(profile || {}));
  res.json({
    session_id: sessionId,
    message: "Session started with persistent SQLite storage.",
  });
});

// Get session
app.get("/sessions/:session_id", (req, res) => {
  const session = getSessionOr404(req.params.session_id);
  if (!session) {
    return res.status(404).json({ detail: "Session not found or already cleared." });
  }
  res.json({
    profile: JSON.parse(session.profile || "{}"),
    transactions: session.transactions,
    privacy: "persistent-sqlite",
    ai: { provider: "local-express", status: "active" },
  });
});

// Delete session
app.delete("/sessions/:session_id", (req, res) => {
  const sessionId = req.params.session_id;
  const delTx = db.prepare("DELETE FROM transactions WHERE session_id = ?");
  const delSes = db.prepare("DELETE FROM sessions WHERE id = ?");
  delTx.run(sessionId);
  const result = delSes.run(sessionId);
  if (result.changes === 0) {
    return res.status(404).json({ detail: "Session not found." });
  }
  res.json({ deleted: true, message: "Session data cleared." });
});

app.post("/delete-all-data", (req, res) => {
  const sessionId = req.body.session_id;
  const delTx = db.prepare("DELETE FROM transactions WHERE session_id = ?");
  const delSes = db.prepare("DELETE FROM sessions WHERE id = ?");
  delTx.run(sessionId);
  delSes.run(sessionId);
  res.json({ deleted: true, message: "All session data cleared." });
});

// Add transactions
app.post("/transactions", (req, res) => {
  const { session_id, transactions } = req.body;
  const session = getSessionOr404(session_id);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }

  const normalized = normalizeTransactions(transactions);
  const insertStmt = db.prepare(
    "INSERT INTO transactions (session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const insertMany = db.transaction((txs) => {
    for (const t of txs) {
      insertStmt.run(session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });

  insertMany(normalized);
  const updated = getSessionOr404(session_id);
  res.json({ transactions: updated.transactions, count: updated.transactions.length });
});

// Replace transactions
app.post("/transactions/replace", (req, res) => {
  const { session_id, transactions } = req.body;
  const session = getSessionOr404(session_id);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }

  const normalized = normalizeTransactions(transactions);
  const delStmt = db.prepare("DELETE FROM transactions WHERE session_id = ?");
  const insertStmt = db.prepare(
    "INSERT INTO transactions (session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const replaceTx = db.transaction((txs) => {
    delStmt.run(session_id);
    for (const t of txs) {
      insertStmt.run(session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });

  replaceTx(normalized);
  const updated = getSessionOr404(session_id);
  res.json({ transactions: updated.transactions, count: updated.transactions.length });
});

// Parse text input
app.post("/parse-text-input", (req, res) => {
  const { session_id, text } = req.body;
  const session = getSessionOr404(session_id);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }

  const transactions = parseTextToTransactions(text);
  if (transactions.length === 0) {
    return res.status(400).json({ detail: "No transactions could be parsed from the text." });
  }

  const insertStmt = db.prepare(
    "INSERT INTO transactions (session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertMany = db.transaction((txs) => {
    for (const t of txs) {
      insertStmt.run(session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });
  insertMany(transactions);

  const updated = getSessionOr404(session_id);
  res.json({ transactions: updated.transactions, parsed_count: transactions.length });
});

// Upload statement (CSV / text)
app.post("/upload-statement", upload.single("file"), (req, res) => {
  const sessionId = req.body.session_id;
  const session = getSessionOr404(sessionId);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }

  if (!req.file) {
    return res.status(400).json({ detail: "No file uploaded." });
  }

  const content = req.file.buffer.toString("utf8");
  const transactions = parseTextToTransactions(content);
  if (transactions.length === 0) {
    return res.status(400).json({ detail: "No transactions could be parsed from this file." });
  }

  const insertStmt = db.prepare(
    "INSERT INTO transactions (session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertMany = db.transaction((txs) => {
    for (const t of txs) {
      insertStmt.run(sessionId, t.date, t.description, t.amount, t.type, t.category);
    }
  });
  insertMany(transactions);

  const updated = getSessionOr404(sessionId);
  res.json({ transactions: updated.transactions, parsed_count: transactions.length });
});

// Analysis & Metrics helper middleware check
function requireTransactions(req, res, next) {
  const sessionId = req.body.session_id;
  const session = getSessionOr404(sessionId);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }
  if (!session.transactions || session.transactions.length === 0) {
    return res.status(400).json({ detail: "Add financial data before generating analysis." });
  }
  req.sessionData = session;
  next();
}

app.post("/metrics", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json(metrics);
});

app.post("/generate-personality", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json(generatePersonality(metrics));
});

app.post("/generate-insights", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json(generateInsights(metrics));
});

app.post("/generate-actions", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json({ actions: generateActions(metrics) });
});

app.post("/generate-full-analysis", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  const personality = generatePersonality(metrics);
  const insights = generateInsights(metrics);
  const actions = generateActions(metrics);
  res.json({
    tag: personality.tag,
    summary: personality.summary,
    swot: personality.swot,
    insights: insights.insights,
    actions,
  });
});

app.post("/nudge/test", requireTransactions, (req, res) => {
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json(generateNudge(metrics));
});

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT} with SQLite persistence.`);
});
