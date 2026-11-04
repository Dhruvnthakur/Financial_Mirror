const CATEGORY_RULES = {
  "Food & Dining": ["swiggy", "zomato", "restaurant", "cafe", "food", "dining", "pizza", "coffee"],
  "Transport": ["uber", "ola", "metro", "fuel", "petrol", "diesel", "cab", "taxi", "bus"],
  "Shopping": ["amazon", "flipkart", "myntra", "shopping", "store", "mall"],
  "Entertainment": ["netflix", "spotify", "prime", "movie", "cinema", "hotstar", "game"],
  "Bills & Utilities": ["electricity", "wifi", "internet", "mobile", "bill", "utility", "recharge"],
  "Rent & Housing": ["rent", "maintenance", "housing", "flat"],
  "Health": ["pharmacy", "doctor", "hospital", "medicine", "clinic"],
  "Education": ["course", "tuition", "book", "college", "school", "udemy"],
  "Savings & Investments": ["sip", "mutual fund", "fd", "deposit", "investment", "savings"],
  "Income": ["salary", "stipend", "freelance", "income", "credited", "payroll"],
};

const DISCRETIONARY_CATEGORIES = new Set(["Food & Dining", "Shopping", "Entertainment"]);

function categorize(description, transactionType = "expense") {
  if (transactionType === "income") return "Income";
  const text = (description || "").toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }
  return "Other";
}

function normalizeTransactions(transactions) {
  return (transactions || []).map(tx => ({
    date: tx.date || new Date().toISOString().split("T")[0],
    description: tx.description || "Unknown",
    amount: parseFloat(tx.amount) || 0,
    type: tx.type || "expense",
    category: (!tx.category || tx.category === "Uncategorized")
      ? categorize(tx.description, tx.type)
      : tx.category,
  }));
}

function parseTextToTransactions(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const transactions = [];
  for (const line of lines) {
    const parts = line.split(",").map(p => p.trim());
    if (parts.length >= 3) {
      const date = parts[0];
      const description = parts[1];
      const amount = parseFloat(parts[2]) || 0;
      const type = (parts[3] || "").toLowerCase() === "income" ? "income" : "expense";
      transactions.push({ date, description, amount, type, category: categorize(description, type) });
    }
  }
  return transactions;
}

function buildMetrics(session, transactions) {
  const profile = session.profile ? JSON.parse(session.profile) : {};
  const monthlyIncome = parseFloat(profile.monthly_income) || 0;

  const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const effectiveIncome = income || monthlyIncome;
  const savings = Math.max(effectiveIncome - expenses, 0);
  const savingsRate = effectiveIncome ? savings / effectiveIncome : 0;

  const byCategory = {};
  const byMonth = {};
  let weekendSpend = 0;
  let weekdaySpend = 0;

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;

    const month = (t.date || "").substring(0, 7) || "Unknown";
    byMonth[month] = (byMonth[month] || 0) + t.amount;

    try {
      const day = new Date(t.date).getDay();
      if (day === 0 || day === 6) weekendSpend += t.amount;
      else weekdaySpend += t.amount;
    } catch {
      weekdaySpend += t.amount;
    }
  }

  const discretionary = Object.entries(byCategory)
    .filter(([cat]) => DISCRETIONARY_CATEGORIES.has(cat))
    .reduce((sum, [, val]) => sum + val, 0);

  const discretionaryRatio = expenses ? discretionary / expenses : 0;
  const expenseRatio = effectiveIncome ? expenses / effectiveIncome : 0;

  let score = 100;
  if (savingsRate < 0.2) score -= Math.round((0.2 - savingsRate) * 120);
  if (discretionaryRatio > 0.3) score -= Math.round((discretionaryRatio - 0.3) * 80);
  if (expenseRatio > 0.85) score -= Math.round((expenseRatio - 0.85) * 90);
  if (weekendSpend > weekdaySpend * 0.45) score -= 8;
  score = Math.max(0, Math.min(100, score));

  const sortedCategories = Object.fromEntries(
    Object.entries(byCategory).sort(([, a], [, b]) => b - a)
  );

  return {
    income: Math.round(effectiveIncome * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savings_rate: Math.round(savingsRate * 1000) / 1000,
    expense_ratio: Math.round(expenseRatio * 1000) / 1000,
    discretionary: Math.round(discretionary * 100) / 100,
    discretionary_ratio: Math.round(discretionaryRatio * 1000) / 1000,
    by_category: sortedCategories,
    by_month: byMonth,
    weekend_spend: Math.round(weekendSpend * 100) / 100,
    weekday_spend: Math.round(weekdaySpend * 100) / 100,
    score,
    transaction_count: transactions.length,
  };
}

function generatePersonality(metrics) {
  let tag = "Balanced Optimizer";
  if (metrics.savings_rate >= 0.3 && metrics.expense_ratio < 0.7) {
    tag = "Conservative Saver";
  } else if (metrics.discretionary_ratio > 0.38) {
    tag = "Impulse Spender";
  } else if (metrics.expense_ratio > 0.9) {
    tag = "Paycheck-to-Paycheck Operator";
  } else if ((metrics.by_category["Entertainment"] || 0) + (metrics.by_category["Shopping"] || 0) > metrics.income * 0.25) {
    tag = "Lifestyle-Heavy Spender";
  }

  return {
    tag,
    summary: `Your financial health score is ${metrics.score}/100. You are currently saving about ${Math.round(metrics.savings_rate * 100)}% of income, while discretionary spending is about ${Math.round(metrics.discretionary_ratio * 100)}% of expenses.`,
    swot: {
      strengths: metrics.savings_rate >= 0.2 ? ["Consistent positive savings buffer", "Healthy income allocation"] : ["Active income stream"],
      weaknesses: metrics.discretionary_ratio > 0.3 ? ["High discretionary expenditure ratio", "Weekend spending spikes"] : ["Moderate expense leakage"],
      opportunities: ["Automate monthly investments", "Redirect subscription spends to index funds"],
      threats: ["Unexpected emergency expenses without dedicated buffer", "Inflationary pressure on lifestyle"],
    },
  };
}

function generateInsights(metrics) {
  const topCategories = Object.entries(metrics.by_category);
  const topCatName = topCategories[0]?.[0] || "General";
  const topCatVal = topCategories[0]?.[1] || 0;

  return {
    insights: [
      {
        title: `Highest Outflow in ${topCatName}`,
        description: `You spent ₹${topCatVal.toLocaleString()} on ${topCatName}, making it your largest expense category.`,
        impact: "high",
      },
      {
        title: "Savings Buffer Analysis",
        description: `Your current savings rate is ${Math.round(metrics.savings_rate * 100)}%. ${metrics.savings_rate >= 0.2 ? "Great job maintaining a solid buffer!" : "Consider aiming for at least 20% savings."}`,
        impact: metrics.savings_rate >= 0.2 ? "low" : "high",
      },
      {
        title: "Weekend vs Weekday Spending",
        description: `Weekend spending stands at ₹${metrics.weekend_spend.toLocaleString()} vs Weekday at ₹${metrics.weekday_spend.toLocaleString()}.`,
        impact: "medium",
      },
    ],
  };
}

function generateActions(metrics) {
  return [
    { step: 1, title: "Audit recurring subscriptions", action: "Review and cancel unused streaming or SaaS subscriptions.", impact: "Save ~₹2,000/month" },
    { step: 2, title: "Cap weekend discretionary spend", action: "Set a strict weekend entertainment budget to curb impulse dining out.", impact: "Boost savings rate by 4%" },
    { step: 3, title: "Automate investments", action: "Set up auto-debit SIP on salary credit day.", impact: "Build long-term compounding wealth" },
  ];
}

function generateNudge(metrics) {
  return {
    message: metrics.score < 60 ? "⚠️ Financial Alert: Discretionary spending is outpacing safe thresholds this week." : "💡 Tip: You're on track! Consider moving surplus cash into short-term liquid funds.",
    severity: metrics.score < 60 ? "warning" : "info",
  };
}

module.exports = {
  normalizeTransactions,
  parseTextToTransactions,
  buildMetrics,
  generatePersonality,
  generateInsights,
  generateActions,
  generateNudge,
};
