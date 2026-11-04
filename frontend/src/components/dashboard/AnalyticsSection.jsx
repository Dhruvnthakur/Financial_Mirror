import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, ShoppingBag, Zap } from 'lucide-react';

const CATEGORY_COLORS = {
  "Food & Dining":          "#f97316",
  "Transport":              "#3b82f6",
  "Shopping":               "#8b5cf6",
  "Entertainment":          "#ec4899",
  "Bills & Utilities":      "#14b8a6",
  "Rent & Housing":         "#f59e0b",
  "Health":                 "#22c55e",
  "Education":              "#06b6d4",
  "Savings & Investments":  "#a855f7",
  "Income":                 "#10b981",
  "Other":                  "#6b7280",
};
const FALLBACK_COLORS = ["#8a2be2", "#080cff", "#f97316", "#3b82f6", "#ec4899", "#14b8a6"];

export default function AnalyticsSection({ metrics, transactions }) {
  const hasData = metrics && (metrics.expenses > 0 || metrics.income > 0);

  const categoryData = hasData
    ? Object.entries(metrics.by_category || {})
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value], i) => ({
          name, value: Math.round(value),
          fill: CATEGORY_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }))
    : [];

  const monthlyData = hasData
    ? Object.entries(metrics.by_month || {}).map(([month, amount]) => ({
        month: month.slice(5), amount: Math.round(amount),
      }))
    : [];

  const topCategory      = categoryData[0];
  const topCategoryColor = topCategory?.fill || "#8a2be2";
  const weekendPct       = hasData && metrics.expenses > 0
    ? Math.round((metrics.weekend_spend / metrics.expenses) * 100) : 0;
  const savingsRatePct   = hasData ? Math.round((metrics.savings_rate || 0) * 100) : 0;
  const discretionaryPct = hasData ? Math.round((metrics.discretionary_ratio || 0) * 100) : 0;

  return (
    <div className="w-full relative z-10 flex flex-col items-center">
      <SectionHeader title="Analytics" subtitle="Deep dive into your financial reality" />

      {!hasData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
            <AlertCircle size={28} className="text-[#988ca0]" />
          </div>
          <h3 className="font-manrope font-bold text-2xl text-white">No data yet</h3>
          <p className="font-inter text-[#988ca0]">
            Upload a bank statement or add transactions to see your analytics come alive.
          </p>
        </motion.div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <RevealBlock>
            <div className="w-full max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
              <KpiCard label="Total Income"   value={`₹${(metrics.income   || 0).toLocaleString('en-IN')}`} color="#10b981" icon={<TrendingUp  size={18}/>} />
              <KpiCard label="Total Expenses" value={`₹${(metrics.expenses || 0).toLocaleString('en-IN')}`} color="#f97316" icon={<TrendingDown size={18}/>} />
              <KpiCard label="Net Savings"    value={`₹${(metrics.savings  || 0).toLocaleString('en-IN')}`} color="#8a2be2" icon={<Zap          size={18}/>} />
              <KpiCard label="Health Score"   value={`${metrics.score || 0}/100`}
                color={metrics.score >= 70 ? "#22c55e" : metrics.score >= 40 ? "#f59e0b" : "#ef4444"}
                icon={<AlertCircle size={18}/>}
              />
            </div>
          </RevealBlock>

          {/* ══ WHAT ══ */}
          <RevealBlock>
            <div className="w-full max-w-5xl px-6 mb-24">
              <BigHeading word="WHAT" color={topCategoryColor} sub="Where your money goes" />
              <div className="grid md:grid-cols-2 gap-8 mt-8">

                {/* Donut */}
                <div className="glass-card p-8">
                  <p className="overline mb-6 text-orange-400">SPENDING BREAKDOWN</p>
                  {categoryData.length > 0 ? (
                    <div className="flex gap-6 items-center">
                      <div className="w-48 h-48 shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={categoryData} innerRadius={55} outerRadius={72}
                              paddingAngle={3} dataKey="value"
                              animationDuration={1200} animationEasing="ease-out">
                              {categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: "rgba(10,10,12,0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontFamily: "Inter" }}
                              formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, ""]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="font-manrope text-lg font-bold text-white">{categoryData.length}</span>
                          <span className="text-[10px] uppercase tracking-widest text-[#988ca0]">Categories</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        {categoryData.map((cat, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-inter">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.fill }} />
                            <span className="text-[#cfc2d7] truncate flex-1">{cat.name}</span>
                            <span className="text-white font-semibold shrink-0">₹{cat.value.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#988ca0] font-inter text-sm">No expense categories yet.</p>
                  )}
                </div>

                {/* Top category story */}
                <div className="glass-card p-8 flex flex-col justify-center" style={{ borderColor: `${topCategoryColor}30` }}>
                  <p className="overline mb-4" style={{ color: topCategoryColor }}>TOP CATEGORY</p>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="font-manrope font-bold text-3xl mb-3 text-[#e5e2e1]"
                  >
                    <span style={{ color: topCategoryColor }}>{topCategory?.name || "No data"}</span>{" "}
                    is your biggest expense.
                  </motion.h3>
                  <p className="font-inter text-[#988ca0]">
                    ₹{(topCategory?.value || 0).toLocaleString('en-IN')} spent —{" "}
                    {metrics.expenses > 0 ? Math.round(((topCategory?.value || 0) / metrics.expenses) * 100) : 0}% of your total outflow.
                  </p>
                </div>
              </div>
            </div>
          </RevealBlock>

          {/* ══ WHEN ══ */}
          <RevealBlock>
            <div className="w-full max-w-5xl px-6 mb-24">
              <BigHeading word="WHEN" color="#3b82f6" sub="How spending shifts across time" />
              <div className="grid md:grid-cols-2 gap-8 mt-8">

                {/* Monthly Bar */}
                <div className="glass-card p-8">
                  <p className="overline mb-6 text-blue-400">MONTHLY SPEND</p>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={monthlyData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fill: "#988ca0", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#988ca0", fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: "rgba(10,10,12,0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontFamily: "Inter" }}
                          formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, "Spent"]}
                        />
                        <defs>
                          <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8a2be2" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <Bar dataKey="amount" fill="url(#barGrad2)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[#988ca0] font-inter text-sm">Add data with dates to see monthly trends.</p>
                  )}
                </div>

                {/* Weekend vs Weekday */}
                <div className="glass-card p-8 flex flex-col justify-center">
                  <p className="overline mb-6 text-blue-400">WEEKEND VS WEEKDAY</p>
                  <div className="flex flex-col gap-5">
                    <div>
                      <div className="flex justify-between text-sm font-inter mb-2">
                        <span className="text-[#988ca0]">Weekend</span>
                        <span className="text-white font-semibold">{weekendPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} whileInView={{ width: `${weekendPct}%` }}
                          viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-purple-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-inter mb-2">
                        <span className="text-[#988ca0]">Weekday</span>
                        <span className="text-white font-semibold">{100 - weekendPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} whileInView={{ width: `${100 - weekendPct}%` }}
                          viewport={{ once: true }} transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                          className="h-full rounded-full bg-blue-500"
                        />
                      </div>
                    </div>
                    <p className="font-inter text-[#988ca0] text-sm mt-2">
                      {weekendPct > 35
                        ? `${weekendPct}% of your budget goes on weekends — a high-leakage pattern.`
                        : "Your weekend spending is balanced. Good discipline."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RevealBlock>

          {/* ══ HOW ══ */}
          <RevealBlock>
            <div className="w-full max-w-5xl px-6 mb-8">
              <BigHeading word="HOW" color="#22c55e" sub="The efficiency of your financial engine" />
              <div className="grid md:grid-cols-2 gap-8 mt-8">

                {/* Left — Behavior metric cards */}
                <div className="flex flex-col gap-4">
                  <BehaviorCard
                    icon={<TrendingUp size={18} />}
                    color={savingsRatePct >= 20 ? "#22c55e" : "#f97316"}
                    title={`Savings rate: ${savingsRatePct}%`}
                    desc={savingsRatePct >= 20
                      ? "Meeting the recommended 20% target."
                      : `${20 - savingsRatePct}% below the 20% target.`}
                    progress={Math.min(savingsRatePct, 100)}
                    progressColor={savingsRatePct >= 20 ? "#22c55e" : "#f97316"}
                  />
                  <BehaviorCard
                    icon={<ShoppingBag size={18} />}
                    color={discretionaryPct <= 35 ? "#14b8a6" : "#ef4444"}
                    title={`Discretionary: ${discretionaryPct}%`}
                    desc={discretionaryPct > 35
                      ? `Above the healthy 35% threshold.`
                      : `Within healthy bounds.`}
                    progress={Math.min(discretionaryPct, 100)}
                    progressColor={discretionaryPct <= 35 ? "#14b8a6" : "#ef4444"}
                  />
                  <BehaviorCard
                    icon={<Zap size={18} />}
                    color={weekendPct <= 35 ? "#8a2be2" : "#f59e0b"}
                    title={`Weekend leakage: ${weekendPct}%`}
                    desc={weekendPct > 35
                      ? `Set a cap before next weekend.`
                      : "Weekend spending is under control."}
                    progress={Math.min(weekendPct, 100)}
                    progressColor={weekendPct <= 35 ? "#8a2be2" : "#f59e0b"}
                  />
                </div>

                {/* Right — Behaviour Patterns card */}
                <div className="glass-card p-8 flex flex-col gap-6">
                  <p className="overline text-purple-400">BEHAVIOUR PATTERNS</p>
                  <div className="flex flex-col gap-5">
                    <PatternRow
                      label="Impulse risk"
                      value={discretionaryPct > 35 ? "High" : discretionaryPct > 20 ? "Moderate" : "Low"}
                      color={discretionaryPct > 35 ? "#ef4444" : discretionaryPct > 20 ? "#f59e0b" : "#22c55e"}
                      detail={`${discretionaryPct}% discretionary ratio`}
                    />
                    <PatternRow
                      label="Savings discipline"
                      value={savingsRatePct >= 20 ? "Strong" : savingsRatePct >= 10 ? "Moderate" : "Weak"}
                      color={savingsRatePct >= 20 ? "#22c55e" : savingsRatePct >= 10 ? "#f59e0b" : "#ef4444"}
                      detail={`${savingsRatePct}% saved of income`}
                    />
                    <PatternRow
                      label="Weekend behaviour"
                      value={weekendPct > 35 ? "Leaking" : weekendPct > 20 ? "Moderate" : "Balanced"}
                      color={weekendPct > 35 ? "#f59e0b" : weekendPct > 20 ? "#3b82f6" : "#22c55e"}
                      detail={`${weekendPct}% of spend on weekends`}
                    />
                    <PatternRow
                      label="Spending archetype"
                      value={
                        discretionaryPct > 38 ? "Impulse Spender" :
                        savingsRatePct >= 30 ? "Conservative Saver" :
                        savingsRatePct >= 20 ? "Balanced Optimizer" :
                        "Comfort Spender"
                      }
                      color="#dcb8ff"
                      detail="Based on your ratios"
                    />
                  </div>
                </div>
              </div>
            </div>
          </RevealBlock>
        </>
      )}
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function BigHeading({ word, color, sub }) {
  return (
    <div className="flex flex-col gap-1">
      <motion.h2
        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="font-manrope font-extrabold tracking-tight leading-none"
        style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", color }}
      >
        {word}
      </motion.h2>
      <p className="font-inter text-[#988ca0] text-sm pl-1">{sub}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      className="text-center mb-20"
    >
      <h2 className="font-manrope font-bold text-5xl mb-4 tracking-tight">{title}</h2>
      <p className="font-inter text-[#988ca0] text-lg tracking-wide">{subtitle}</p>
    </motion.div>
  );
}

function RevealBlock({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-150px" }} transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

function KpiCard({ label, value, color, icon }) {
  return (
    <div className="glass-card p-5 flex flex-col gap-2" style={{ borderColor: `${color}20` }}>
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="font-inter text-xs uppercase tracking-widest text-[#988ca0]">{label}</span>
      </div>
      <span className="font-manrope font-bold text-2xl text-white">{value}</span>
    </div>
  );
}

function BehaviorCard({ icon, color, title, desc, progress, progressColor }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4" style={{ borderColor: `${color}20` }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-manrope font-bold text-white mb-1 text-sm">{title}</h4>
        <p className="text-xs font-inter text-[#988ca0] mb-2">{desc}</p>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} whileInView={{ width: `${progress}%` }}
            viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full" style={{ background: progressColor }}
          />
        </div>
      </div>
    </div>
  );
}

function PatternRow({ label, value, color, detail }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-inter text-xs text-[#988ca0] uppercase tracking-wider">{label}</span>
        <span className="font-inter text-xs text-[#6b7280]">{detail}</span>
      </div>
      <span className="font-manrope font-bold text-sm shrink-0 px-3 py-1 rounded-full"
        style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
        {value}
      </span>
    </div>
  );
}

