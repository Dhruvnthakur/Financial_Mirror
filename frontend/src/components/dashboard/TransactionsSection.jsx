import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Shield } from 'lucide-react';
import { formatMoney } from '../../utils/formatters.js';

export default function TransactionsSection({ transactions }) {
  const displayTransactions = transactions || [];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 relative z-10">
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-12">
        <div>
          <h2 className="font-manrope font-bold text-3xl text-white mb-2">Ledger Control</h2>
          <p className="font-inter text-[#988ca0] text-sm">Your data. Your control.</p>
        </div>
        
        <button className="hidden md:flex btn-primary items-center gap-2 mt-4 md:mt-0 shadow-lg">
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      <div className="glass-card p-0 overflow-hidden border border-white/5">
        
        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/5 bg-[#131313]/60 font-inter text-xs font-semibold uppercase tracking-widest text-[#988ca0]">
          <div className="col-span-5">Name</div>
          <div className="col-span-3 text-right">Amount</div>
          <div className="col-span-2 text-center">Date</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto hide-scrollbar">
          {displayTransactions.length === 0 ? (
            <div className="p-12 text-center text-[#988ca0] font-inter">
              <Shield size={32} className="mx-auto mb-4 opacity-50" />
              <p>No transactions available.</p>
            </div>
          ) : (
            displayTransactions.map((tx, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: (idx % 10) * 0.05 }}
                key={tx.id || idx} 
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-1 md:col-span-5 font-manrope font-medium text-white truncate text-lg md:text-base">
                  {tx.description || tx.vendor || "Transaction"}
                  <div className="text-xs text-[#988ca0] font-inter mt-1 block md:hidden">{tx.date}</div>
                </div>
                
                <div className={`col-span-1 md:col-span-3 font-manrope font-bold text-xl md:text-right ${tx.type === 'expense' || tx.is_expense ? 'text-white' : 'text-green-400'}`}>
                  {tx.type === 'expense' || tx.is_expense ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                
                <div className="col-span-2 font-inter text-sm text-[#988ca0] text-center hidden md:block">
                  {tx.date}
                </div>
                
                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-4 md:mt-0">
                  <button className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#cfc2d7] hover:text-white hover:bg-white/10 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      
      {/* Mobile Add Button Floating */}
      <button className="md:hidden fixed bottom-24 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-[0_0_20px_rgba(138,43,226,0.4)] flex items-center justify-center text-white z-40">
        <Plus size={24} />
      </button>

    </div>
  );
}
