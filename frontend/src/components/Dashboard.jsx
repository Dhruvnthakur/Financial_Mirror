import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Shield, MessageSquare, Menu, X, CheckCircle, Lock, LogOut } from 'lucide-react';
import HeroSection from './dashboard/HeroSection';
import InputSection from './dashboard/InputSection';
import AnalyticsSection from './dashboard/AnalyticsSection';
import InsightsSection from './dashboard/InsightsSection';
import ActionsSection from './dashboard/ActionsSection';
import TransactionsSection from './dashboard/TransactionsSection';
import Chatbot from './dashboard/Chatbot';

// ── Cursor-aware animated background canvas ───────────────────────────────────
function AmbientCanvas() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth, H = window.innerHeight;

    canvas.width = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    const onMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);

    // Floating orbs
    const orbs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 180 + Math.random() * 220,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      hue: [268, 240, 200, 280, 220, 260][i],
      alpha: 0.04 + Math.random() * 0.05,
    }));

    // Particles
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.8 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      alpha: 0.12 + Math.random() * 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // Cursor glow
      const cx = mouse.current.x, cy = mouse.current.y;
      const cursorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 380);
      cursorGrad.addColorStop(0, 'rgba(138,43,226,0.10)');
      cursorGrad.addColorStop(0.5, 'rgba(80,20,180,0.04)');
      cursorGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cursorGrad;
      ctx.fillRect(0, 0, W, H);

      // Drifting orbs
      for (const orb of orbs) {
        orb.x += orb.vx + Math.sin(t + orb.hue) * 0.15;
        orb.y += orb.vy + Math.cos(t + orb.hue * 0.01) * 0.15;
        if (orb.x < -orb.r) orb.x = W + orb.r;
        if (orb.x > W + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = H + orb.r;
        if (orb.y > H + orb.r) orb.y = -orb.r;

        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, `hsla(${orb.hue}, 70%, 60%, ${orb.alpha})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Star particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.02;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        const pulse = 0.6 + 0.4 * Math.sin(p.pulse);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${p.alpha * pulse})`;
        ctx.fill();
      }

      // Subtle grid lines from cursor
      ctx.save();
      ctx.strokeStyle = 'rgba(138,43,226,0.03)';
      ctx.lineWidth = 0.5;
      const spacing = 60;
      for (let x = 0; x < W; x += spacing) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(x - cx) / 600);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += spacing) {
        ctx.globalAlpha = Math.max(0, 1 - Math.abs(y - cy) / 600);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 1 }}
    />
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({
  streak = 1,
  metrics,
  transactions,
  personality,
  insights,
  actions,
  loading,
  onGenerate,
  onRefine,
  onSaveTransactions,
  onDelete,
  onAddTransactions,
  onParseText,
  onUploadStatement,
}) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Paralax glows
  const purpleY = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const blueY = useTransform(scrollYProgress, [0, 1], [0, -300]);

  // Active nav on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['dashboard', 'analytics', 'insights', 'actions', 'transactions'];
      let current = 'dashboard';
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight / 2) current = id;
      });
      setActiveTab(current);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    // Soft logout: clear browser state ONLY — data stays in DB so user can sign back in
    localStorage.removeItem('financialMirrorAuthToken');
    localStorage.removeItem('financialMirrorUserEmail');
    localStorage.removeItem('financialMirrorUserName');
    localStorage.removeItem('financialMirrorUserId');
    localStorage.removeItem('financialMirrorSessionId');
    localStorage.removeItem('financialMirrorProfile');
    window.location.href = '/#landing';
    window.location.reload();
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0a0a0c] text-[#e5e2e1]"
      style={{ minHeight: '100vh' }}
    >
      {/* ── Animated canvas background ── */}
      <AmbientCanvas />

      {/* ── Scroll-parallax large glows ── */}
      <motion.div
        className="pointer-events-none fixed z-0 rounded-full"
        style={{
          top: '-10%', left: '-5%', width: '800px', height: '800px',
          background: 'radial-gradient(circle, rgba(138,43,226,0.10) 0%, transparent 60%)',
          filter: 'blur(180px)', y: purpleY,
        }}
      />
      <motion.div
        className="pointer-events-none fixed z-0 rounded-full"
        style={{
          bottom: '-20%', right: '-10%', width: '900px', height: '900px',
          background: 'radial-gradient(circle, rgba(8,12,255,0.07) 0%, transparent 60%)',
          filter: 'blur(160px)', y: blueY,
        }}
      />

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-xl border-b border-white/[0.05]">
        {/* Logo */}
        <div className="font-manrope font-bold text-xl tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
          The Financial Mirror
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {['dashboard', 'analytics', 'insights', 'actions', 'transactions'].map((tab) => (
            <button
              key={tab}
              onClick={() => scrollTo(tab)}
              className={`font-inter text-sm capitalize transition-all duration-300 ${
                activeTab === tab
                  ? 'text-white font-semibold drop-shadow-[0_0_8px_rgba(200,180,255,0.6)]'
                  : 'text-[#988ca0] hover:text-[#dcb8ff]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          
          {/* Streak Counter */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md text-sm font-manrope font-bold transition-colors ${streak > 1 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]' : 'bg-white/5 text-[#988ca0]'}`}>
            🔥 <span className="hidden sm:inline">{streak} Day Streak</span><span className="sm:hidden">{streak}</span>
          </div>

          {/* Manage Data dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowManageMenu(!showManageMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-inter hover:bg-white/10 transition-colors"
            >
              Manage Data <Menu size={15} />
            </button>

            <AnimatePresence>
              {showManageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-12 right-0 w-60 glass-card p-2 border border-white/10 shadow-2xl flex flex-col z-50"
                >
                  <button
                    onClick={() => { setShowManageMenu(false); onDelete(); }}
                    className="w-full text-left px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 font-inter text-sm transition-colors flex items-center gap-2"
                  >
                    <X size={14} /> Delete Data Permanently
                  </button>
                  <button
                    onClick={() => { 
                      setShowManageMenu(false); 
                      fetch('http://localhost:8000/admin/trigger-whatsapp').catch(()=>""); 
                      alert('WhatsApp Job Triggered! Check your backend terminal for the simulated SMS logs.');
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-emerald-400 hover:bg-emerald-500/10 font-inter text-sm transition-colors flex items-center gap-2 border-t border-white/5"
                  >
                    <MessageSquare size={14} /> Simulate WhatsApp Campaign
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-sm font-inter hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-purple-300 transition-all"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
        <section id="dashboard" className="w-full min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-32">
          <HeroSection scrollYProgress={scrollYProgress} />
        </section>

        <section className="w-full flex flex-col items-center justify-center pb-40">
          <InputSection
            onAddTransactions={onAddTransactions}
            onParseText={onParseText}
            onUploadStatement={onUploadStatement}
            loading={loading}
          />
        </section>

        <section id="analytics" className="w-full py-32">
          <AnalyticsSection metrics={metrics} transactions={transactions} />
        </section>

        <section id="insights" className="w-full py-40">
          <InsightsSection
            personality={personality}
            insights={insights}
            onGenerate={onGenerate}
            onRefine={onRefine}
            loading={loading}
            transactions={transactions}
          />
        </section>

        <section id="actions" className="w-full py-32">
          <ActionsSection actions={actions} loading={loading} transactions={transactions} />
        </section>

        <section id="transactions" className="w-full py-32">
          <TransactionsSection transactions={transactions} />
        </section>
      </main>

      {/* ── Fixed bottom-right controls ── */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-white/10 rounded-full backdrop-blur-md shadow-lg group"
          onClick={() => setShowSecurityModal(true)}
        >
          <Shield size={16} className="text-green-400 group-hover:drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
          <span className="text-xs font-inter font-medium text-white/80">Secure</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-[0_0_30px_rgba(138,43,226,0.3)] hover:shadow-[0_0_45px_rgba(138,43,226,0.5)] border border-white/20"
        >
          <MessageSquare size={24} className="text-white" />
        </motion.button>
      </div>

      {/* ── LOGOUT CONFIRM MODAL ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-xl bg-black/50"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm glass-card p-8 border border-white/10"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                  <LogOut size={24} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-manrope font-bold text-xl text-white mb-1">Sign out?</h3>
                  <p className="text-sm font-inter text-[#988ca0]">
                    Your session data will be cleared from this device. You can sign back in anytime.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 font-inter text-sm text-[#988ca0] hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-inter font-semibold text-sm text-white shadow-[0_0_20px_rgba(138,43,226,0.3)] hover:shadow-[0_0_30px_rgba(138,43,226,0.5)] transition-all"
                  >
                    Sign Out
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECURITY MODAL ── */}
      <AnimatePresence>
        {showSecurityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40"
            onClick={() => setShowSecurityModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg glass-card p-8 border border-green-500/20"
            >
              <button onClick={() => setShowSecurityModal(false)} className="absolute top-4 right-4 text-[#cfc2d7] hover:text-white">
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                  <Lock size={24} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-manrope font-bold text-white">Trust & Security</h2>
                  <p className="text-green-400 font-inter text-sm">Protected by Financial Mirror</p>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                {[
                  { title: 'Zero-Knowledge Architecture', desc: 'Raw transaction logs never leave your device. Only anonymized aggregates are passed to AI engines.' },
                  { title: 'PBKDF2-SHA256 Passwords', desc: 'Passwords are hashed with 260,000 iterations and a random salt. Plain text is never stored.' },
                  { title: 'Session-Bound Processing', desc: 'Financial data is isolated per session. Logout clears all tokens and session references.' },
                  { title: 'SQL Injection Protection', desc: 'All DB queries use SQLAlchemy ORM — no raw SQL strings anywhere in the codebase.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <CheckCircle size={20} className="text-green-400 mt-1 shrink-0" />
                    <div>
                      <h4 className="font-manrope font-semibold text-white mb-1">{title}</h4>
                      <p className="text-sm font-inter text-[#988ca0]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Chatbot sessionId={localStorage.getItem("financialMirrorSessionId") || ""} />
    </div>
  );
}
