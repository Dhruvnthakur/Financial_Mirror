const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pdfParse = require("pdf-parse");
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
const JWT_SECRET = process.env.JWT_SECRET || "financial_mirror_secret_key_2026";

app.use(cors());
app.use(express.json());

// Helper: Get session matching SQLAlchemy schema (profile_json)
function getSession(sessionId) {
  const stmt = db.prepare("SELECT id, profile_json, created_at FROM sessions WHERE id = ?");
  const session = stmt.get(sessionId);
  if (!session) return null;
  const txStmt = db.prepare("SELECT date, description, amount, type, category FROM transactions WHERE session_id = ?");
  const transactions = txStmt.all(sessionId);
  return { ...session, profile: session.profile_json, transactions };
}

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "Financial Mirror API (Express + SQLite)",
    status: "ok",
    privacy: "persistent database storage (SQLite)",
  });
});

// Auth Routes
app.post("/auth/signup", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required." });
  }
  try {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (id, email, hashed_password, name) VALUES (?, ?, ?, ?)");
    stmt.run(userId, email, hashedPassword, name || "User");
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user_id: userId, email, name: name || "User" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(400).json({ detail: "Email already registered or invalid input." });
  }
});

app.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password are required." });
  }
  try {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email);
    if (!user || !user.hashed_password || !(await bcrypt.compare(password, user.hashed_password))) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user_id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ detail: "Internal server error during signin." });
  }
});

app.get("/auth/me", (req, res) => {
  const token = req.query.token || (req.headers.authorization || "").replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const stmt = db.prepare("SELECT id, email, name FROM users WHERE id = ?");
    const user = stmt.get(decoded.userId);
    if (!user) return res.status(404).json({ detail: "User not found." });
    res.json({ user });
  } catch {
    res.status(401).json({ detail: "Invalid or expired token." });
  }
});

// OTP Simulation
const activeOtps = new Map();
app.post("/auth/send-otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ detail: "Phone number required." });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps.set(phone, otp);
  console.log(`\n==================================================\n[SECURITY] OTP for ${phone} is: ${otp}\n==================================================\n`);
  res.json({ message: "OTP sent successfully", mock_otp: otp });
});

app.post("/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const validOtp = activeOtps.get(phone);
  // Allow universal test OTP '123456' for smooth testing on Render
  if (String(otp) !== "123456" && (!validOtp || String(validOtp) !== String(otp))) {
    return res.status(400).json({ detail: "Invalid or expired OTP." });
  }
  if (validOtp) activeOtps.delete(phone);
  const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, message: "OTP verified successfully." });
});

// Sessions Routes
app.post("/sessions/start", (req, res) => {
  const { profile, session_id } = req.body;
  const sessionId = session_id || uuidv4();
  const existing = getSession(sessionId);

  if (existing) {
    const updateStmt = db.prepare("UPDATE sessions SET profile_json = ? WHERE id = ?");
    updateStmt.run(JSON.stringify(profile || {}), sessionId);
  } else {
    const insertStmt = db.prepare("INSERT INTO sessions (id, profile_json) VALUES (?, ?)");
    insertStmt.run(sessionId, JSON.stringify(profile || {}));
  }

  res.json({
    session_id: sessionId,
    message: "Session started with SQLite persistence.",
  });
});

app.get("/sessions/:session_id", (req, res) => {
  const session = getSession(req.params.session_id);
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

app.delete("/sessions/:session_id", (req, res) => {
  const sessionId = req.params.session_id;
  db.prepare("DELETE FROM transactions WHERE session_id = ?").run(sessionId);
  const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  if (result.changes === 0) {
    return res.status(404).json({ detail: "Session not found." });
  }
  res.json({ deleted: true, message: "Session data cleared." });
});

// Transactions Routes
app.post("/transactions", (req, res) => {
  const { session_id, transactions } = req.body;
  const session = getSession(session_id);
  if (!session) return res.status(404).json({ detail: "Session not found." });

  const normalized = normalizeTransactions(transactions);
  const insertStmt = db.prepare(
    "INSERT INTO transactions (id, session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMany = db.transaction((txs) => {
    for (const t of txs) {
      insertStmt.run(uuidv4(), session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });
  insertMany(normalized);

  const updated = getSession(session_id);
  res.json({ transactions: updated.transactions, count: updated.transactions.length });
});

app.post("/transactions/replace", (req, res) => {
  const { session_id, transactions } = req.body;
  const session = getSession(session_id);
  if (!session) return res.status(404).json({ detail: "Session not found." });

  const normalized = normalizeTransactions(transactions);
  const delStmt = db.prepare("DELETE FROM transactions WHERE session_id = ?");
  const insertStmt = db.prepare(
    "INSERT INTO transactions (id, session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const replaceTx = db.transaction((txs) => {
    delStmt.run(session_id);
    for (const t of txs) {
      insertStmt.run(uuidv4(), session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });
  replaceTx(normalized);

  const updated = getSession(session_id);
  res.json({ transactions: updated.transactions, count: updated.transactions.length });
});

app.post("/parse-text-input", (req, res) => {
  const { session_id, text } = req.body;
  const session = getSession(session_id);
  if (!session) return res.status(404).json({ detail: "Session not found." });

  const transactions = parseTextToTransactions(text);
  if (transactions.length === 0) {
    return res.status(400).json({ detail: "No transactions could be parsed from the text." });
  }

  const insertStmt = db.prepare(
    "INSERT INTO transactions (id, session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMany = db.transaction((txs) => {
    for (const t of txs) {
      insertStmt.run(uuidv4(), session_id, t.date, t.description, t.amount, t.type, t.category);
    }
  });
  insertMany(transactions);

  const updated = getSession(session_id);
  res.json({ transactions: updated.transactions, parsed_count: transactions.length });
});

// Upload statement (PDF / CSV / text)
app.post("/upload-statement", upload.single("file"), async (req, res) => {
  const sessionId = req.body.session_id;
  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ detail: "Session not found." });
  }

  if (!req.file) {
    return res.status(400).json({ detail: "No file uploaded." });
  }

  try {
    let content = "";
    const filename = (req.file.originalname || "").toLowerCase();
    if (filename.endsWith(".pdf")) {
      const pdfData = await pdfParse(req.file.buffer);
      content = pdfData.text;
    } else {
      content = req.file.buffer.toString("utf8");
    }

    const transactions = parseTextToTransactions(content);
    if (transactions.length === 0) {
      return res.status(400).json({ detail: "No transactions could be parsed from this file." });
    }

    const insertStmt = db.prepare(
      "INSERT INTO transactions (id, session_id, date, description, amount, type, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertMany = db.transaction((txs) => {
      for (const t of txs) {
        insertStmt.run(uuidv4(), sessionId, t.date, t.description, t.amount, t.type, t.category);
      }
    });
    insertMany(transactions);

    const updated = getSession(sessionId);
    res.json({ transactions: updated.transactions, parsed_count: transactions.length });
  } catch (err) {
    console.error("Statement upload error:", err);
    res.status(400).json({ detail: "Failed to parse uploaded statement file." });
  }
});

// Analysis & Chat Routes
function requireTransactions(req, res, next) {
  const sessionId = req.body.session_id;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ detail: "Session not found." });
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

app.post("/chat", requireTransactions, (req, res) => {
  const { message } = req.body;
  const metrics = buildMetrics(req.sessionData, req.sessionData.transactions);
  res.json({
    reply: `Based on your financial reflection (Savings Rate: ${Math.round(metrics.savings_rate * 100)}%, Health Score: ${metrics.score}/100), regarding "${message}": Keep optimizing your recurring subscriptions and allocate surplus toward index funds.`,
  });
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT} with SQLite persistence.`);
});
