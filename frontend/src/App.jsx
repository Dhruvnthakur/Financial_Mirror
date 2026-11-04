import { useEffect, useState } from "react";

import { api } from "./api/client.js";
import LandingPage from "./components/LandingPage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import OnboardingForm from "./components/OnboardingForm.jsx";
import Dashboard from "./components/Dashboard.jsx";

// Steps: "landing" → "auth" → "onboarding" → "app"

export default function App() {
  // Determine initial step — always start at landing unless fully loaded session exists
  const [step, setStep] = useState("landing");
  const [sessionId, setSessionId] = useState("");
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [insights, setInsights] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // On mount: check if we can resume a valid session
  useEffect(() => {
    const token = localStorage.getItem("financialMirrorAuthToken");
    const savedSessionId = localStorage.getItem("financialMirrorSessionId");

    if (token && savedSessionId) {
      // Try to restore existing session with a 3s timeout
      const timeout = setTimeout(() => {
        localStorage.removeItem("financialMirrorSessionId");
        setStep("landing");
      }, 3000);

      api.getSession(savedSessionId)
        .then((session) => {
          clearTimeout(timeout);
          setSessionId(savedSessionId);
          setProfile(session.profile || null);
          setTransactions(session.transactions || []);
          if ((session.transactions || []).length > 0) {
            api.metrics(savedSessionId).then(setMetrics).catch(() => {});
            api.personality(savedSessionId).then(setPersonality).catch(() => {});
            api.insights(savedSessionId).then(setInsights).catch(() => {});
            api.actions(savedSessionId).then(r => setActions(r?.actions || [])).catch(() => {});
          }
          setStep("app");
        })
        .catch(() => {
          clearTimeout(timeout);
          localStorage.removeItem("financialMirrorSessionId");
          localStorage.removeItem("financialMirrorAuthToken");
          setStep("landing");
        });
    } else {
      setStep("landing");
    }
  }, []);

  function changeStep(next) {
    setStep(next);
    // Sync URL hash for UX
    const validHashes = { landing: "#landing", auth: "#auth", onboarding: "#onboarding", app: "#app" };
    window.history.replaceState({}, "", validHashes[next] || "#landing");
  }

  async function run(operation) {
    setLoading(true);
    setError("");
    try {
      return await operation();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function refreshSession(id = sessionId) {
    const session = await api.getSession(id);
    setTransactions(session.transactions || []);
    setProfile(session.profile || profile);
    if ((session.transactions || []).length > 0) {
      const latestMetrics = await api.metrics(id);
      setMetrics(latestMetrics);
      api.personality(id).then(setPersonality).catch(() => {});
      api.insights(id).then(setInsights).catch(() => {});
      api.actions(id).then(r => setActions(r?.actions || [])).catch(() => {});
    }
  }

  // Called from AuthPage after successful signin/signup  
  function handleAuthSuccess(user_id) {
    const savedProfile = localStorage.getItem("financialMirrorProfile");
    
    // Resume session immediately using user_id as the fixed session_id!
    api.getSession(user_id)
      .then((session) => {
        setSessionId(user_id);
        localStorage.setItem("financialMirrorSessionId", user_id);
        localStorage.setItem("financialMirrorProfile", JSON.stringify(session.profile));
        setProfile(session.profile);
        setTransactions(session.transactions || []);
        if ((session.transactions || []).length > 0) {
          api.metrics(user_id).then(setMetrics).catch(() => {});
          api.personality(user_id).then(setPersonality).catch(() => {});
          api.insights(user_id).then(setInsights).catch(() => {});
          api.actions(user_id).then(r => setActions(r?.actions || [])).catch(() => {});
        }
        // FORCED HACKATHON DEMO BYPASS: Show Onboarding/OTP wall for everyone
        changeStep("onboarding");
      })
      .catch(() => {
        // No session found for this user. Time for onboarding.
        setSessionId(user_id);
        localStorage.setItem("financialMirrorSessionId", user_id);
        changeStep("onboarding");
      });
  }

  async function startSession(nextProfile) {
    await run(async () => {
      const forcedSessionId = localStorage.getItem("financialMirrorSessionId") || sessionId;
      const response = await api.startSession(nextProfile, forcedSessionId);
      setProfile(nextProfile);
      setSessionId(response.session_id);
      localStorage.setItem("financialMirrorSessionId", response.session_id);
      localStorage.setItem("financialMirrorProfile", JSON.stringify(nextProfile));
      changeStep("app");
    });
  }

  async function addTransactions(items) {
    if (!items.length) return;
    await run(async () => {
      const response = await api.addTransactions(sessionId, items);
      setTransactions(response.transactions);
      const m = await api.metrics(sessionId);
      setMetrics(m);
      // auto-generate actions immediately after adding data
      api.actions(sessionId).then(r => setActions(r?.actions || [])).catch(() => {});
    });
  }

  async function parseText(text) {
    await run(async () => {
      const response = await api.parseText(sessionId, text);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
      api.actions(sessionId).then(r => setActions(r?.actions || [])).catch(() => {});
    });
  }

  async function uploadStatement(file) {
    await run(async () => {
      const response = await api.uploadStatement(sessionId, file);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
      api.actions(sessionId).then(r => setActions(r?.actions || [])).catch(() => {});
    });
  }

  async function saveTransactions(items) {
    await run(async () => {
      const response = await api.replaceTransactions(sessionId, items);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
      setPersonality(null);
      setInsights(null);
      setActions(null);
    });
  }

  async function generateAnalysis() {
    await run(async () => {
      const [nextMetrics, nextPersonality, nextInsights, nextActions] = await Promise.all([
        api.metrics(sessionId),
        api.personality(sessionId),
        api.insights(sessionId),
        api.actions(sessionId),
      ]);
      setMetrics(nextMetrics);
      setPersonality(nextPersonality);
      setInsights(nextInsights);
      setActions(nextActions.actions);
    });
  }

  async function refineInsights() {
    await run(async () => {
      const nextInsights = await api.insights(sessionId);
      setInsights(nextInsights);
    });
  }

  async function deleteAllData() {
    await run(async () => {
      if (sessionId) await api.deleteAll(sessionId).catch(() => {});
      localStorage.removeItem("financialMirrorSessionId");
      localStorage.removeItem("financialMirrorProfile");
      localStorage.removeItem("financialMirrorAuthToken");
      localStorage.removeItem("financialMirrorUserEmail");
      localStorage.removeItem("financialMirrorUserName");
      setSessionId("");
      setProfile(null);
      setTransactions([]);
      setMetrics(null);
      setPersonality(null);
      setInsights(null);
      setActions(null);
      changeStep("landing");
    });
  }

  // ── ROUTING ──────────────────────────────────────────────────────────────

  if (step === "landing") {
    return (
      <LandingPage
        onStart={() => changeStep("auth")}   // "Initialize Reflection" → auth first
        onLogin={() => changeStep("auth")}   // nav "Login" button
      />
    );
  }

  if (step === "auth") {
    return (
      <AuthPage
        onLogin={handleAuthSuccess}
        onBack={() => changeStep("landing")}
      />
    );
  }

  if (step === "onboarding") {
    return <OnboardingForm onSubmit={startSession} loading={loading} />;
  }

  const streak = Number(localStorage.getItem("financialMirrorStreak")) || 1;

  // Dashboard
  return (
    <Dashboard
      streak={streak}
      metrics={metrics}
      transactions={transactions}
      personality={personality}
      insights={insights}
      actions={actions}
      loading={loading}
      onGenerate={generateAnalysis}
      onRefine={refineInsights}
      onSaveTransactions={saveTransactions}
      onDelete={deleteAllData}
      onAddTransactions={addTransactions}
      onParseText={parseText}
      onUploadStatement={uploadStatement}
    />
  );
}
