import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';

export default function ActionsSection({ actions, loading, transactions }) {
  const hasTransactions = transactions && transactions.length > 0;
  const hasActions = Array.isArray(actions) && actions.length > 0;

  // ── Empty state — no transactions ──────────────────────────────────────────
  if (!hasTransactions) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-400/20 flex items-center justify-center">
          <AlertCircle size={28} className="text-orange-400" />
        </div>
        <div className="max-w-sm">
          <h3 className="font-manrope font-bold text-2xl text-white mb-2">No actions yet</h3>
          <p className="font-inter text-[#988ca0] text-sm leading-relaxed">
            Add transactions first — personalised action cards will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  // ── Prompt to generate — has transactions but no actions yet ───────────────
  if (!hasActions) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-400/20 flex items-center justify-center">
          <Zap size={28} className="text-green-400" />
        </div>
        <div className="max-w-sm">
          <h3 className="font-manrope font-bold text-2xl text-white mb-2">Ready to generate actions</h3>
          <p className="font-inter text-[#988ca0] text-sm leading-relaxed">
            You have {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}. Click "Generate Insights" in the section above to unlock personalised action cards.
          </p>
        </div>
      </div>
    );
  }

  // ── Real action flip cards ─────────────────────────────────────────────────
  // Map backend objects → {problem, action} objects for the flip cards
  const actionCards = hasActions
    ? actions.map((a, i) => {
        if (typeof a === "object" && a.title) {
          return { problem: a.title, action: a.action ? `${a.action} (${a.impact || ''})` : (a.impact || "Implement this optimization.") };
        }
        if (typeof a === "object" && a.problem) return a;
        const str = String(a);
        const dot = str.indexOf('. ');
        const problem = dot !== -1 ? str.slice(0, dot + 1) : str.slice(0, 60) + (str.length > 60 ? '…' : '');
        const action  = dot !== -1 ? str.slice(dot + 2) : str;
        return { problem, action };
      })
    : [];

  return (
    <div className="w-full max-w-5xl mx-auto px-6 relative z-10 flex flex-col items-center">
      <div className="text-center mb-20 max-w-2xl">
        <h2 className="font-manrope font-bold text-4xl md:text-5xl mb-4 tracking-tight text-white">
          Small changes. Big difference.
        </h2>
        <p className="font-inter text-[#988ca0] text-lg">
          Flip the cards to reveal actionable steps tailored to your financial data.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full">
        {actionCards.map((item, index) => (
          <FlipCard key={index} item={item} index={index} />
        ))}
      </div>
    </div>
  );
}

function FlipCard({ item, index }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="relative w-full h-[320px] cursor-pointer group perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative preserve-3d transition-all duration-700"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
      >
        {/* Front Face */}
        <div className="absolute inset-0 backface-hidden flex flex-col p-8 glass-card border-red-500/20 hover:border-red-500/40">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none rounded-[inherit]" />
          
          {/* Action N label */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
              <AlertCircle size={20} />
            </div>
            <span className="font-inter font-bold text-red-400 uppercase tracking-[0.2em] text-xs">
              Action {index + 1}
            </span>
          </div>

          <h3 className="font-manrope font-bold text-white text-xl leading-snug flex-1">
            {item.problem}
          </h3>

          <p className="mt-4 text-xs text-[#988ca0] font-inter uppercase tracking-widest flex items-center gap-2">
            <span>Flip to reveal →</span>
          </p>
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 backface-hidden flex flex-col p-8 glass-card border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent pointer-events-none rounded-[inherit]" />

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <span className="font-inter font-bold text-green-400 uppercase tracking-[0.2em] text-xs">
              Do This
            </span>
          </div>

          <p className="font-inter text-[#e5e2e1] text-sm leading-relaxed flex-1">
            {item.action}
          </p>

          <p className="mt-4 text-xs text-green-400/70 font-inter uppercase tracking-widest">
            Action {index + 1} of {3}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

