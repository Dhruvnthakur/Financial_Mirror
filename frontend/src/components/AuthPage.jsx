import { useState, useEffect } from "react";
import { api } from "../api/client.js";

export default function AuthPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return;
    setLoading(true);
    try {
      let resp;
      if (mode === "signup") {
        resp = await api.signUp(email, password, name);
      } else {
        resp = await api.signIn(email, password);
      }
      // Persist auth token
      localStorage.setItem("financialMirrorAuthToken", resp.token);
      localStorage.setItem("financialMirrorUserEmail", resp.email);
      localStorage.setItem("financialMirrorUserName", resp.name);
      localStorage.setItem("financialMirrorUserId", resp.user_id);
      onLogin(resp.user_id);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden selection:bg-[#8a2be2] selection:text-white"
      style={{ background: "#050505" }}
      onMouseMove={handleMouseMove}
    >
      {/* Dynamic mouse glow */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          width: "800px", height: "800px",
          left: mousePos.x - 400, top: mousePos.y - 400,
          background: "radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(8,12,255,0.05) 40%, transparent 70%)",
          filter: "blur(60px)",
          transition: "left 0.1s, top 0.1s",
        }}
      />
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#080cff] opacity-[0.03] filter blur-[100px]" />
      </div>

      {/* Back button */}
      <div className="absolute top-8 left-8 z-20">
        <button onClick={onBack} className="flex items-center gap-2 font-inter text-sm text-[#988ca0] hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none">
          <span className="material-symbols-outlined text-[1.1rem]">arrow_back</span>
          Return
        </button>
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-8 sm:p-10">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8a2be2]/20 to-[#080cff]/20 border border-white/5 flex items-center justify-center shadow-[0_0_20px_rgba(138,43,226,0.2)]">
              <span className="material-symbols-outlined text-[#dcb8ff]">vpn_key</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-[#131313] border border-white/5 p-1 mb-6">
            {["signin", "signup"].map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(""); }}
                className={`flex-1 py-2 rounded-lg font-inter text-sm font-semibold transition-all ${
                  mode === tab
                    ? "bg-gradient-to-r from-[#8a2be2] to-[#080cff] text-white shadow-lg"
                    : "text-[#988ca0] hover:text-white"
                }`}
              >
                {tab === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <h2 className="font-manrope text-white text-center text-2xl font-bold mb-1 tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="font-inter text-[#988ca0] text-center text-sm mb-6">
            {mode === "signin"
              ? "Access your financial mirror securely."
              : "Your data stays private. No bank credentials stored."}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-inter text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-white font-inter text-sm focus:outline-none focus:border-[#8a2be2]/50 focus:bg-[#1a1a1a] transition-all placeholder:text-[#4c4354]"
              />
            )}
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-white font-inter text-sm focus:outline-none focus:border-[#8a2be2]/50 focus:bg-[#1a1a1a] transition-all placeholder:text-[#4c4354]"
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-white font-inter text-sm focus:outline-none focus:border-[#8a2be2]/50 focus:bg-[#1a1a1a] transition-all placeholder:text-[#4c4354]"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group rounded-xl font-manrope font-semibold overflow-hidden shadow-[0_0_20px_rgba(138,43,226,0.2)] hover:shadow-[0_0_30px_rgba(138,43,226,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              style={{ padding: "0.875rem 0", color: "#fff" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#8a2be2] to-[#080cff]" />
              <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity" />
              <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide">
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {mode === "signin" ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  mode === "signin" ? "Sign In →" : "Create Account →"
                )}
              </span>
            </button>
          </form>

          <p className="font-inter text-[#4c4354] text-xs text-center mt-6">
            {mode === "signin" ? "No account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
              className="text-[#dcb8ff] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
            >
              {mode === "signin" ? "Create one →" : "Sign in →"}
            </button>
          </p>
          <p className="font-inter text-[#4c4354] text-xs text-center mt-2">
            Session data is localized. We do not transmit transaction payloads to third parties.
          </p>
        </div>
      </div>
    </main>
  );
}
