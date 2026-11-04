import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Mic, UploadCloud, X, CheckCircle, Shield } from 'lucide-react';

export default function InputSection({ onAddTransactions, onParseText, onUploadStatement, loading }) {
  const [activeModal, setActiveModal] = useState(null);

  return (
    <div className="w-full relative z-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6">
        
        {/* CARD 1: Manual Entry */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveModal('manual')}
          className="group relative flex flex-col items-start p-8 rounded-2xl border border-white/5 bg-[#1a1a1a]/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-colors duration-500" />
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-purple-300 group-hover:shadow-[0_0_20px_rgba(138,43,226,0.5)] transition-all">
            <Edit3 size={24} />
          </div>
          <h3 className="font-manrope font-bold text-xl mb-2 text-white">Add something you spent</h3>
          <p className="font-inter text-[#988ca0] text-sm mb-8 flex-grow">Manually classify your transactions.</p>
          <div className="font-inter font-semibold text-purple-400 group-hover:text-white transition-colors flex items-center gap-2">
            Start typing <span className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
          </div>
        </motion.button>

        {/* CARD 2: Voice Input */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveModal('voice')}
          className="group relative flex flex-col items-start p-8 rounded-2xl border border-white/5 bg-[#1a1a1a]/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 transition-colors duration-500" />
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-blue-300 group-hover:shadow-[0_0_20px_rgba(8,12,255,0.5)] transition-all">
            <Mic size={24} />
          </div>
          <h3 className="font-manrope font-bold text-xl mb-2 text-white">Just say it. We’ll log it.</h3>
          <p className="font-inter text-[#988ca0] text-sm mb-8 flex-grow">AI converts your voice into structured entries.</p>
          <div className="font-inter font-semibold text-blue-400 group-hover:text-white transition-colors flex items-center gap-2">
            Speak now <span className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
          </div>
        </motion.button>

        {/* CARD 3: CSV Upload */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveModal('csv')}
          className="group relative flex flex-col items-start p-8 rounded-2xl border border-white/5 bg-[#1a1a1a]/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-orange-500/0 group-hover:from-pink-500/10 group-hover:to-orange-500/10 transition-colors duration-500" />
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-orange-300 group-hover:shadow-[0_0_20px_rgba(255,165,0,0.5)] transition-all">
            <UploadCloud size={24} />
          </div>
          <h3 className="font-manrope font-bold text-xl mb-2 text-white">Upload your data safely</h3>
          <p className="font-inter text-[#988ca0] text-sm mb-8 flex-grow">Drag & drop your bank CSV export securely.</p>
          <div className="font-inter font-semibold text-orange-400 group-hover:text-white transition-colors flex items-center gap-2">
            Upload file <span className="text-xl leading-none transition-transform group-hover:translate-x-1">→</span>
          </div>
        </motion.button>
      </div>

      {/* Trust Micro-Bar */}
      <div className="mt-16 overflow-hidden max-w-3xl mx-auto flex justify-center border-t border-b border-white/5 py-4">
        <motion.div 
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-8 px-6 overflow-hidden whitespace-nowrap"
        >
          <div className="flex items-center gap-2 text-xs font-inter text-[#988ca0] tracking-widest uppercase">
            <Shield size={14} className="text-purple-400" /> Your financial data is encrypted and never shared.
          </div>
          <div className="flex items-center gap-2 text-xs font-inter text-[#988ca0] tracking-widest uppercase opacity-50">
            • Delete anytime •
          </div>
        </motion.div>
      </div>

      {/* Modals Rendering */}
      <AnimatePresence>
        {activeModal && (
          <Modal close={() => setActiveModal(null)}>
            {activeModal === 'manual' && <ManualModal close={() => setActiveModal(null)} onAddTransactions={onAddTransactions} loading={loading} />}
            {activeModal === 'voice' && <VoiceModal close={() => setActiveModal(null)} onParseText={onParseText} loading={loading} />}
            {activeModal === 'csv' && <CsvModal close={() => setActiveModal(null)} onUploadStatement={onUploadStatement} loading={loading} />}
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, close }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="absolute inset-0" onClick={close} />
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-md bg-[#131313]/90 border border-white/10 rounded-3xl backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <button onClick={close} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
          <X size={20} />
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* Modals Internals */
function ManualModal({ close, onAddTransactions, loading }) {
  const [form, setForm] = useState({ 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    is_expense: true,
    category: ''
  });

  const predefinedCategories = [
    "Food & Dining",
    "Transportation",
    "Bills & Utilities",
    "Entertainment",
    "Shopping",
    "Health & Fitness",
    "Travel",
    "Education",
    "Gifts & Donations",
    "Other"
  ];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    const isExpense = String(form.is_expense) === 'true';
    const amt = parseFloat(form.amount) || 0;
    const finalAmount = isExpense ? -Math.abs(amt) : Math.abs(amt);

    const transaction = {
      description: form.description,
      amount: finalAmount,
      date: form.date,
      vendor: form.description,
      is_expense: isExpense,
      category: form.category || "Other"
    };
    await onAddTransactions([transaction]);
    close();
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold font-manrope text-white mb-6">Manual Entry</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#988ca0] uppercase tracking-wider">Type</span>
            <select value={form.is_expense} onChange={e => setForm({...form, is_expense: e.target.value === 'true'})} className="field appearance-none">
              <option value="true">Expense</option>
              <option value="false">Income</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#988ca0] uppercase tracking-wider">Amount</span>
            <input type="number" required placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="field text-xl font-bold" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#988ca0] uppercase tracking-wider">Description</span>
          <input type="text" required placeholder="Coffee, Rent, etc." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="field" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#988ca0] uppercase tracking-wider flex items-center justify-between">
            Category <span className="text-xs text-[#988ca0]/50 lowercase">select or type</span>
          </span>
          <input 
            type="text" 
            list="txn-categories" 
            placeholder="Food, Travel, etc." 
            value={form.category} 
            onChange={e => setForm({...form, category: e.target.value})} 
            className="field" 
          />
          <datalist id="txn-categories">
            {predefinedCategories.map((cat, i) => (
              <option key={i} value={cat} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#988ca0] uppercase tracking-wider">Date</span>
          <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="field text-[#988ca0]" />
        </label>

        <button type="submit" disabled={loading} className="mt-4 btn-primary w-full justify-center">
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}

function VoiceModal({ close, onParseText, loading }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [sttError, setSttError] = useState('');
  const recognitionRef = React.useRef(null);

  // Check if browser supports Web Speech API
  const hasSpeechAPI = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    setSttError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';      // Indian English — handles Rs, rupees, etc.
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join(' ');
      setText(prev => prev ? prev + ' ' + transcript : transcript);
      setListening(false);
    };

    recognition.onerror = (event) => {
      setSttError('Could not understand audio. Please try again or type manually.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <div className="p-8 flex flex-col items-center text-center">
      <h2 className="text-2xl font-bold font-manrope text-white mb-1">Voice Entry</h2>
      <p className="text-[#988ca0] text-sm mb-6">
        Say something like <em>"Spent 500 on Netflix yesterday"</em>
      </p>

      {hasSpeechAPI ? (
        <>
          {/* Mic button */}
          <div className="relative mb-4">
            {listening && (
              <div className="absolute inset-0 bg-red-500 rounded-full blur-[40px] opacity-40 animate-pulse" />
            )}
            <button
              onClick={listening ? stopListening : startListening}
              disabled={loading}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                listening
                  ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_30px_rgba(8,12,255,0.4)] hover:scale-110'
              }`}
            >
              {listening
                ? <div className="w-5 h-5 bg-white rounded-sm" />
                : <Mic size={32} className="text-white" />
              }
            </button>
          </div>
          <p className="text-xs font-inter text-[#988ca0] mb-4">
            {listening ? '🔴 Listening... tap mic to stop' : 'Tap mic and speak'}
          </p>
        </>
      ) : (
        <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-inter text-xs text-left w-full">
          ⚠️ Your browser doesn't support voice input. Please use Chrome or Edge, or type manually below.
        </div>
      )}

      {sttError && (
        <div className="w-full mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-inter text-xs text-left">
          {sttError}
        </div>
      )}

      <textarea
        placeholder={hasSpeechAPI ? "Transcript appears here — edit before confirming..." : "Type your transaction here..."}
        value={text}
        onChange={e => setText(e.target.value)}
        className="field w-full min-h-[90px] mb-5 resize-none text-sm"
      />

      <button
        disabled={loading || !text.trim()}
        onClick={async () => { await onParseText(text); close(); }}
        className="btn-primary w-full justify-center"
      >
        {loading ? 'Logging...' : 'Confirm Entry →'}
      </button>
    </div>
  );
}



function CsvModal({ close, onUploadStatement, loading }) {
  const [file, setFile] = useState(null);
  
  return (
    <div className="p-8 flex flex-col items-center text-center">
      <h2 className="text-2xl font-bold font-manrope text-white mb-2">Upload CSV/PDF</h2>
      <p className="text-[#988ca0] text-sm mb-8">Supported: HDFC, SBI, Axis, ICICI, etc.</p>

      <label className="w-full flex-grow flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer mb-6 group">
        <UploadCloud size={40} className="text-[#988ca0] mb-4 group-hover:text-purple-400 group-hover:scale-110 transition-all" />
        <span className="font-inter text-sm text-[#e5e2e1] font-medium">{file ? file.name : "Click to select a file"}</span>
        <input type="file" accept=".csv,.xls,.xlsx,.pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
      </label>

      <button 
        disabled={loading || !file} 
        onClick={async () => { await onUploadStatement(file); close(); }} 
        className="btn-primary w-full justify-center"
      >
        {loading ? 'Uploading...' : 'Confirm Import'}
      </button>
    </div>
  );
}
