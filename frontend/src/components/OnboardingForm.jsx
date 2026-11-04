import { useState } from "react";
import { api } from "../api/client.js";

const initialProfile = {
  name: "",
  phone: "",
  monthly_income: "",
  financial_goal: "",
};

export default function OnboardingForm({ onSubmit, loading }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("financialMirrorProfile");
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleInitialSubmit(event) {
    event.preventDefault();
    setSendingOtp(true);
    setOtpError("");
    try {
      await api.sendOtp(profile.phone);
      setOtpStep(true);
    } catch (err) {
      setOtpError(err.message || "Failed to send OTP. Please check the backend.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setOtpError("");
    try {
      await api.verifyOtp(profile.phone, otp);
      
      // Final save
      const payload = {
        ...profile,
        monthly_income: Number(profile.monthly_income),
      };
      localStorage.setItem("financialMirrorProfile", JSON.stringify(payload));
      onSubmit(payload);
    } catch (err) {
      setOtpError(err.message || "Invalid OTP");
    }
  }

  const fields = [
    { key: "name", label: "Your Name", type: "text", placeholder: "Alexandra Chen" },
    { key: "phone", label: "Phone Number", type: "tel", placeholder: "+91 98765 43210" },
    { key: "monthly_income", label: "Monthly Income", type: "number", placeholder: "80000" },
    { key: "financial_goal", label: "Primary Financial Goal", type: "text", placeholder: "Emergency fund, debt reduction, travel" },
  ];

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-12"
      style={{ background: "#0e0e0e" }}
    >
      <div
        className="pointer-events-none absolute"
        style={{ top: "10%", left: "15%", width: "500px", height: "500px", borderRadius: "50%", background: "#8a2be2", filter: "blur(150px)", opacity: 0.10 }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 fade-up">
          <p className="overline mb-3">Private Session Initialization</p>
          <h1 className="font-manrope" style={{ fontSize: "2.5rem", fontWeight: 700, color: "#e5e2e1", letterSpacing: "0.02em", lineHeight: 1.15 }}>
            {otpStep ? "Verify your identity." : "Your reflection begins here."}
          </h1>
          <p className="mt-3" style={{ color: "#988ca0", lineHeight: 1.65, maxWidth: "480px" }}>
            {otpStep 
              ? `We sent a secure code to ${profile.phone}. Please enter it below.` 
              : "Profile details stay in your browser. Financial data is cleared when you delete the session."}
          </p>
        </div>

        {!otpStep ? (
          <form className="glass-card fade-up fade-up-1" style={{ padding: "2.5rem" }} onSubmit={handleInitialSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(({ key, label, type, placeholder }) => (
                <label key={key} className="flex flex-col gap-2">
                  <span className="font-inter" style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", color: "#988ca0", textTransform: "uppercase" }}>
                    {label}
                  </span>
                  <input className="field" type={type} placeholder={placeholder} value={profile[key]} min={type === "number" ? "0" : undefined} onChange={(e) => update(key, e.target.value)} required />
                </label>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button className="btn-primary" disabled={sendingOtp}>
                {sendingOtp ? "Sending OTP..." : "Send Verification Code →"}
              </button>
              <p style={{ fontSize: "0.8125rem", color: "#4c4354" }}>End-to-end encrypted</p>
            </div>
          </form>
        ) : (
          <form className="glass-card fade-up" style={{ padding: "2.5rem" }} onSubmit={handleVerifyOtp}>
            <div className="max-w-xs mb-6">
              <label className="flex flex-col gap-2">
                <span className="font-inter" style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", color: "#988ca0", textTransform: "uppercase" }}>
                  6-Digit OTP Code
                </span>
                <input 
                  className="field text-2xl tracking-[0.5em] text-center font-bold font-manrope" 
                  type="text" 
                  maxLength={6} 
                  placeholder="------" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  required 
                  autoFocus
                />
              </label>
              {otpError && <p className="mt-3 text-red-400 text-sm">{otpError}</p>}
            </div>

            <div className="mt-8 flex items-center gap-4 border-t border-white/5 pt-6">
              <button className="btn-primary" disabled={loading}>
                {loading ? "Initializing session..." : "Verify & Begin Analysis →"}
              </button>
              <button type="button" onClick={() => setOtpStep(false)} className="text-sm text-[#988ca0] hover:text-white transition-colors">
                Back
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center fade-up fade-up-2" style={{ fontSize: "0.8rem", color: "#4c4354" }}>
          We never store your financial data permanently. Session analysis only.
        </p>
      </div>
    </main>
  );
}
