const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8002";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || "Request failed");
  }
  return payload;
}

export const api = {
  startSession(profile) {
    return request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({ profile, auto_clear_on_refresh: true }),
    });
  },
  getSession(sessionId) {
    return request(`/sessions/${sessionId}`);
  },
  addTransactions(sessionId, transactions) {
    return request("/transactions", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, transactions }),
    });
  },
  replaceTransactions(sessionId, transactions) {
    return request("/transactions/replace", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, transactions }),
    });
  },
  parseText(sessionId, text) {
    return request("/parse-text-input", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, text }),
    });
  },
  uploadStatement(sessionId, file) {
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", file);
    return request("/upload-statement", {
      method: "POST",
      body: formData,
    });
  },
  metrics(sessionId) {
    return request("/metrics", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
  personality(sessionId) {
    return request("/generate-personality", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
  insights(sessionId) {
    return request("/generate-insights", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
  actions(sessionId) {
    return request("/generate-actions", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
  nudge(sessionId) {
    return request("/nudge/test", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
  deleteAll(sessionId) {
    return request(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};
