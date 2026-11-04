import { useEffect, useState, useRef } from "react";

import { api } from "./api/client.js";
import LandingPage from "./components/LandingPage.jsx";
import AuthPage from "./components/AuthPage.jsx";
import OnboardingForm from "./components/OnboardingForm.jsx";
import MirrorView from "./components/MirrorView.jsx";
import ConstellationsView from "./components/ConstellationsView.jsx";
import LedgerView from "./components/LedgerView.jsx";
import SecurityView from "./components/SecurityView.jsx";

export default function App() {
  const [step, setStep] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'auth', 'onboarding', 'app'].includes(hash)) return hash;
    return "landing";
  });
  const [activeTab, setActiveTab] = useState("mirror"); 
  const observerRef = useRef(null);
  
  const [sessionId, setSessionId] = useState(() => localStorage.getItem("financialMirrorSessionId") || "");
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("financialMirrorProfile");
    return saved ? JSON.parse(saved) : null;
  });
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [insights, setInsights] = useState(null);
  const [actions, setActions] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Push the initial state so back-navigating always finds a valid state
    window.history.replaceState({ step }, '', window.location.pathname + '#' + step);
    
    const handlePopState = (e) => {
      if (e.state && e.state.step) {
        setStep(e.state.step);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (['landing', 'auth', 'onboarding', 'app'].includes(hash)) setStep(hash);
        else setStep(localStorage.getItem("financialMirrorSessionId") ? "app" : "landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // IntersectionObserver for ScrollSpy Tab Navigation
  useEffect(() => {
    if (step !== "app") return;
    
    const handleIntersect = (entries) => {
      // Find the most visible intersecting section
      let maxRatio = 0;
      let targetId = activeTab;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          targetId = entry.target.id;
        }
      });
      if (maxRatio > 0) {
        setActiveTab(targetId);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-20% 0px -40% 0px",
      threshold: [0.1, 0.5, 0.9]
    });

    ["mirror", "insights", "ledger", "security"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [step]); // Re-bind observer if we enter the app step

  const changeStep = (newStep) => {
    setStep(newStep);
    window.history.pushState({ step: newStep }, '', window.location.pathname + '#' + newStep);
  };

  useEffect(() => {
    if (!sessionId) return;
    refreshSession(sessionId).catch(() => {
      localStorage.removeItem("financialMirrorSessionId");
      setSessionId("");
      changeStep("landing");
    });
  }, [sessionId]);

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
    try {
      const session = await api.getSession(id);
      setTransactions(session.transactions || []);
      setProfile(session.profile || profile);
      if ((session.transactions || []).length > 0) {
        const [latestMetrics, nextPersonality, nextInsights, nextActions] = await Promise.all([
          api.metrics(id),
          api.personality(id).catch(() => null),
          api.insights(id).catch(() => null),
          api.actions(id).catch(() => null),
        ]);
        setMetrics(latestMetrics);
        if (nextPersonality) setPersonality(nextPersonality);
        if (nextInsights) setInsights(nextInsights);
        if (nextActions?.actions) setActions(nextActions.actions);
      }
    } catch (err) {
      localStorage.removeItem("financialMirrorSessionId");
      setSessionId("");
      changeStep("landing");
    }
  }

  async function startSession(nextProfile, initialTransactions = null) {
    await run(async () => {
      const response = await api.startSession(nextProfile);
      setProfile(nextProfile);
      setSessionId(response.session_id);
      localStorage.setItem("financialMirrorSessionId", response.session_id);
      localStorage.setItem("financialMirrorProfile", JSON.stringify(nextProfile));
      if (initialTransactions && initialTransactions.length > 0) {
        const txResponse = await api.addTransactions(response.session_id, initialTransactions);
        setTransactions(txResponse.transactions);
        setMetrics(await api.metrics(response.session_id));
        try {
          const [p, i, a] = await Promise.all([
            api.personality(response.session_id),
            api.insights(response.session_id),
            api.actions(response.session_id)
          ]);
          setPersonality(p);
          setInsights(i);
          setActions(a.actions);
        } catch {}
      }
      changeStep("app");
    });
  }

  async function addTransactions(items) {
    if (!items.length) return;
    await run(async () => {
      const response = await api.addTransactions(sessionId, items);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
    });
  }

  async function parseText(text) {
    await run(async () => {
      const response = await api.parseText(sessionId, text);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
    });
  }

  async function uploadStatement(file) {
    await run(async () => {
      const response = await api.uploadStatement(sessionId, file);
      setTransactions(response.transactions);
      setMetrics(await api.metrics(sessionId));
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

  async function sendNudge() {
    await run(async () => {
      const response = await api.nudge(sessionId);
      setNudge(response);
    });
  }

  async function deleteAllData() {
    await run(async () => {
      if (sessionId) await api.deleteAll(sessionId);
      localStorage.removeItem("financialMirrorSessionId");
      localStorage.removeItem("financialMirrorProfile");
      setSessionId("");
      setProfile(null);
      setTransactions([]);
      setMetrics(null);
      setPersonality(null);
      setInsights(null);
      setActions(null);
      setNudge(null);
      changeStep("landing");
    });
  }

  if (step === "landing") {
    return <LandingPage onStart={() => changeStep("onboarding")} onLogin={() => changeStep("auth")} />;
  }

  if (step === "auth") {
    return <AuthPage onLogin={() => changeStep("onboarding")} onBack={() => window.history.back()} />;
  }

  if (step === "onboarding") {
    return <OnboardingForm onSubmit={startSession} loading={loading} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", position: "relative" }}>
      {/* Ambient glows */}
      <div className="pointer-events-none fixed" style={{ top: "-5%", left: "-5%", width: "600px", height: "600px", borderRadius: "50%", background: "#8a2be2", filter: "blur(180px)", opacity: 0.10, zIndex: 0 }} />
      <div className="pointer-events-none fixed" style={{ bottom: "0", right: "-5%", width: "450px", height: "450px", borderRadius: "50%", background: "#080cff", filter: "blur(160px)", opacity: 0.07, zIndex: 0 }} />

      {/* App nav */}
      <nav className="sticky top-0 z-50" style={{ background: "rgba(19,19,19,0.80)", backdropFilter: "blur(28px)", borderBottom: "1px solid rgba(76,67,84,0.22)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1.5rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="font-manrope gradient-text" style={{ fontWeight: 700, fontSize: "1.0625rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              The Financial Mirror
            </span>
          </div>

          <div style={{ display: "flex", gap: "2.5rem", alignItems: "center", height: "100%" }}>
            {["mirror", "insights", "ledger", "security"].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  document.getElementById(tab)?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: activeTab === tab ? "#dcb8ff" : "#4c4354",
                  fontSize: "0.875rem",
                  fontWeight: activeTab === tab ? 600 : 400,
                  textTransform: "capitalize",
                  cursor: "pointer",
                  fontFamily: "Inter, sans-serif",
                  borderBottom: activeTab === tab ? "2px solid #8a2be2" : "2px solid transparent",
                  height: "100%",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s ease"
                }}
              >
                {{ mirror: "Analysis", insights: "Insights", ledger: "Actions", security: "Transaction" }[tab]}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {loading && (
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ffb873", animation: "pulse 1s ease-in-out infinite" }} />
            )}
            <span className="material-symbols-outlined" style={{ color: "#cfc2d7", fontSize: "1.25rem" }}>notifications</span>
            <span className="material-symbols-outlined" style={{ color: "#cfc2d7", fontSize: "1.25rem" }}>mic</span>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#2a2a2a", border: "1px solid #4c4354", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <span className="material-symbols-outlined" style={{ color: "#8a2be2", fontSize: "1rem" }}>person</span>
            </div>
          </div>

        </div>
      </nav>

      {/* Main content */}
      <main style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        
        {error && (
          <div style={{ marginBottom: "1.25rem", background: "rgba(255,180,171,0.08)", border: "1px solid rgba(255,180,171,0.25)", borderRadius: "10px", padding: "1rem 1.25rem", color: "#ffb4ab", fontSize: "0.9375rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6rem" }}>
           <div id="mirror" style={{ scrollMarginTop: "100px" }}>
             <MirrorView 
                metrics={metrics} 
                transactions={transactions} 
                onAddTransactions={addTransactions} 
                onUpload={uploadStatement} 
             />
           </div>
           <div id="insights" style={{ scrollMarginTop: "100px" }}>
             <ConstellationsView 
                personality={personality} 
                insights={insights} 
                transactions={transactions} 
                loading={loading}
                onGenerate={generateAnalysis}
                onRefine={refineInsights}
             />
           </div>
           <div id="ledger" style={{ scrollMarginTop: "100px" }}>
             <LedgerView 
                actions={actions} 
                loading={loading} 
             />
           </div>
           <div id="security" style={{ scrollMarginTop: "100px" }}>
             <SecurityView transactions={transactions} onDelete={deleteAllData} />
           </div>
        </div>
      </main>
    </div>
  );
}
