import { useState } from "react";
import { demoTransactions } from "../data/demoTransactions.js";

const initialProfile = {
  name: "Alexandra Chen",
  phone: "+91 98765 43210",
  monthly_income: "80000",
  financial_goal: "Build 6-month emergency fund & optimize investments",
};

export default function OnboardingForm({ onSubmit, loading }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("financialMirrorProfile");
    return saved ? JSON.parse(saved) : initialProfile;
  });

  function update(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function submit(event, loadDemo = false) {
    if (event) event.preventDefault();
    const payload = {
      ...profile,
      monthly_income: Number(profile.monthly_income) || 80000,
    };
    localStorage.setItem("financialMirrorProfile", JSON.stringify(payload));
    onSubmit(payload, loadDemo ? demoTransactions : null);
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
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "10%",
          left: "15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "#8a2be2",
          filter: "blur(150px)",
          opacity: 0.10,
        }}
      />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 fade-up">
          <p className="overline mb-3">Private Session Initialization</p>
          <h1
            className="font-manrope"
            style={{ fontSize: "2.5rem", fontWeight: 700, color: "#e5e2e1", letterSpacing: "0.02em", lineHeight: 1.15 }}
          >
            Your reflection begins here.
          </h1>
          <p className="mt-3" style={{ color: "#988ca0", lineHeight: 1.65, maxWidth: "480px" }}>
            Profile details stay in your browser. Financial data is cleared when you delete the session — no persistence, no exposure.
          </p>
        </div>

        {/* Form card */}
        <form
          className="glass-card fade-up fade-up-1"
          style={{ padding: "2.5rem" }}
          onSubmit={submit}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map(({ key, label, type, placeholder }) => (
              <label key={key} className="flex flex-col gap-2">
                <span
                  className="font-inter"
                  style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", color: "#988ca0", textTransform: "uppercase" }}
                >
                  {label}
                </span>
                <input
                  className="field"
                  type={type}
                  placeholder={placeholder}
                  value={profile[key]}
                  min={type === "number" ? "0" : undefined}
                  onChange={(e) => update(key, e.target.value)}
                  required
                />
              </label>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="btn-primary" disabled={loading}>
              {loading ? "Initializing session..." : "Begin Custom Analysis →"}
            </button>
            <button
              type="button"
              onClick={(e) => submit(e, true)}
              disabled={loading}
              className="px-6 py-3 rounded-full font-manrope font-semibold text-sm border border-[#8a2be2]/40 bg-[#8a2be2]/10 text-[#dcb8ff] hover:bg-[#8a2be2]/20 transition-all shadow-[0_0_20px_rgba(138,43,226,0.15)]"
            >
              ⚡ Quick Start with Demo Data
            </button>
          </div>
        </form>

        {/* Privacy note */}
        <p className="mt-6 text-center fade-up fade-up-2" style={{ fontSize: "0.8rem", color: "#4c4354" }}>
          We never store your financial data permanently. Session analysis only.
        </p>
      </div>
    </main>
  );
}
