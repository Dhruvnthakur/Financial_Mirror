import { useState } from "react";

export default function AuthPage({ onLogin, onBack }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
       setLoading(false);
       onLogin();
    }, 800);
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden selection:bg-[#8a2be2] selection:text-white"
      style={{ background: "#050505" }}
      onMouseMove={handleMouseMove}
    >
      {/* Background Glow */}
      <div
         className="absolute pointer-events-none transition-opacity duration-500 will-change-transform z-0"
         style={{
            width: "800px",
            height: "800px",
            left: mousePos.x - 400,
            top: mousePos.y - 400,
            background: "radial-gradient(circle, rgba(138,43,226,0.18) 0%, rgba(8,12,255,0.06) 40%, rgba(0,0,0,0) 70%)",
            filter: "blur(60px)",
         }}
      />

      <div className="absolute top-8 left-8 z-20">
         <button
           onClick={onBack}
           className="flex items-center gap-2 font-inter text-sm text-[#988ca0] hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none"
         >
           <span className="material-symbols-outlined text-[1.1rem]">arrow_back</span>
           Return to Landing
         </button>
      </div>

      <div className="relative z-10 w-full max-w-[440px] px-6">
         <div className="rounded-3xl border border-white/10 bg-[#0a0a0c]/90 backdrop-blur-3xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] p-8 sm:p-10">

            {/* Logo / Header */}
            <div className="flex justify-center mb-6">
               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8a2be2] to-[#080cff] flex items-center justify-center shadow-[0_0_25px_rgba(138,43,226,0.4)]">
                  <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
               </div>
            </div>

            <h2 className="font-manrope text-white text-center text-3xl font-bold mb-2 tracking-tight">
              {isSignUp ? "Create Your Vault" : "Welcome Back"}
            </h2>
            <p className="font-inter text-[#988ca0] text-center text-sm mb-8">
              {isSignUp ? "Begin your private financial introspection journey." : "Access your encrypted mirror reflection session."}
            </p>

            {/* Tab Switcher */}
            <div className="flex bg-[#131313] p-1 rounded-xl mb-8 border border-white/5">
               <button
                 type="button"
                 onClick={() => setIsSignUp(false)}
                 className={`flex-1 py-2.5 rounded-lg font-inter text-xs font-semibold transition-all ${!isSignUp ? "bg-white/10 text-white shadow" : "text-[#988ca0] hover:text-white"}`}
               >
                 Sign In
               </button>
               <button
                 type="button"
                 onClick={() => setIsSignUp(true)}
                 className={`flex-1 py-2.5 rounded-lg font-inter text-xs font-semibold transition-all ${isSignUp ? "bg-white/10 text-white shadow" : "text-[#988ca0] hover:text-white"}`}
               >
                 Sign Up
               </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
               <div>
                  <label className="block font-inter text-xs font-medium text-[#988ca0] mb-2">Email Address</label>
                  <input
                     type="email"
                     placeholder="name@example.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-white font-inter text-sm focus:outline-none focus:border-[#8a2be2]/60 focus:bg-[#1a1a1a] transition-all placeholder:text-[#4c4354]"
                     required
                  />
               </div>

               <div>
                  <label className="block font-inter text-xs font-medium text-[#988ca0] mb-2">Password</label>
                  <input
                     type="password"
                     placeholder="••••••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-white font-inter text-sm focus:outline-none focus:border-[#8a2be2]/60 focus:bg-[#1a1a1a] transition-all placeholder:text-[#4c4354]"
                     required
                  />
               </div>

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group rounded-xl font-manrope font-semibold overflow-hidden shadow-[0_0_25px_rgba(138,43,226,0.3)] transition-all hover:shadow-[0_0_35px_rgba(138,43,226,0.5)] disabled:opacity-50 mt-2"
                  style={{ padding: "0.9rem 0", color: "#fff" }}
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#8a2be2] to-[#080cff]" />
                  <div className="absolute inset-0 bg-black opacity-20 group-hover:opacity-0 transition-opacity" />
                  <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide text-sm font-bold">
                     {loading ? (
                        <>
                           <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                           Authenticating...
                        </>
                     ) : (isSignUp ? "Initialize Account" : "Access Reflection")}
                  </span>
               </button>
            </form>

            <div className="flex items-center gap-4 my-6 opacity-60">
               <div className="h-px bg-white/10 flex-1" />
               <span className="font-inter text-[#988ca0] text-[0.65rem] font-bold tracking-widest uppercase">Or connect with</span>
               <div className="h-px bg-white/10 flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <button
                  type="button"
                  onClick={onLogin}
                  className="flex items-center justify-center gap-2 bg-[#131313] border border-white/10 rounded-xl py-3 hover:bg-[#1a1a1a] transition-all group"
               >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-inter text-[#e5e2e1] text-xs font-semibold">Google</span>
               </button>

               <button
                  type="button"
                  onClick={onLogin}
                  className="flex items-center justify-center gap-2 bg-[#131313] border border-white/10 rounded-xl py-3 hover:bg-[#1a1a1a] transition-all group"
               >
                  <span className="material-symbols-outlined text-white text-lg group-hover:scale-110 transition-transform">apple</span>
                  <span className="font-inter text-[#e5e2e1] text-xs font-semibold">Apple</span>
               </button>
            </div>

            <p className="font-inter text-[#4c4354] text-[0.7rem] text-center mt-8 leading-relaxed">
               Zero-knowledge architecture. Ephemeral processing ensures complete cryptographic isolation.
            </p>
         </div>
      </div>
    </main>
  );
}
