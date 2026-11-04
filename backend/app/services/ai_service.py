import json
import os

# Load .env file if present (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.utils.analyzer import build_metrics, generate_actions, generate_insights, generate_personality


# ─── Gemini client (lazy-loaded) ──────────────────────────────────────────────

_gemini_model = None

def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "PASTE_YOUR_NEW_KEY_HERE":
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"},
        )
        return _gemini_model
    except Exception:
        return None


def _ask_gemini(prompt: str) -> dict | None:
    """Send prompt to Gemini, parse JSON response. Returns None on any failure."""
    model = _get_gemini()
    if not model:
        return None
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return None


# ─── Safe aggregate builder (never sends raw transactions to LLM) ─────────────

def _safe_metrics(session: dict) -> dict:
    m = build_metrics(session)
    return {
        "income": round(m["income"], 2),
        "expenses": round(m["expenses"], 2),
        "savings": round(m["savings"], 2),
        "savings_rate_pct": round(m["savings_rate"] * 100, 1),
        "discretionary_ratio_pct": round(m["discretionary_ratio"] * 100, 1),
        "expense_ratio_pct": round(m["expense_ratio"] * 100, 1),
        "top_categories": list(m["by_category"].keys())[:4],
        "weekend_spend": round(m["weekend_spend"], 2),
        "weekday_spend": round(m["weekday_spend"], 2),
        "health_score": m["score"],
    }


# ─── Personality ──────────────────────────────────────────────────────────────

def generate_personality_response(session: dict) -> dict:
    metrics = build_metrics(session)
    payload = _safe_metrics(session)

    prompt = (
        "You are an expert financial psychologist. "
        "Given this anonymized aggregate spending profile (no personal data): "
        + json.dumps(payload)
        + "\n\nGenerate a financial personality profile strictly as JSON:\n"
        '{\n'
        '  "tag": "A catchy 2-4 word archetype title like The Comfort Spender or The Strategic Optimizer",\n'
        '  "summary": "2-3 sentences describing their archetypal financial behavior pattern",\n'
        '  "swot": {\n'
        '    "strengths": ["strength 1", "strength 2"],\n'
        '    "weaknesses": ["weakness 1", "weakness 2"],\n'
        '    "opportunities": ["opportunity 1"],\n'
        '    "threats": ["threat 1"]\n'
        '  }\n'
        '}'
    )

    data = _ask_gemini(prompt)
    if data and "tag" in data:
        data["score"] = metrics["score"]
        data["_source"] = "gemini"
        return data

    # Deterministic fallback
    result = generate_personality(session)
    result["_source"] = "deterministic"
    return result


# ─── Insights ─────────────────────────────────────────────────────────────────

def generate_insight_response(session: dict) -> dict:
    payload = _safe_metrics(session)

    prompt = (
        "You are a strict financial analyst. "
        "Based on this anonymized aggregate data (no raw transactions): "
        + json.dumps(payload)
        + "\n\nGenerate insights strictly as JSON:\n"
        '{\n'
        '  "insights": [\n'
        '    "data-driven insight 1 with specific numbers from the data",\n'
        '    "data-driven insight 2 with specific numbers",\n'
        '    "behavioral observation about spending pattern"\n'
        '  ],\n'
        '  "suggestion": "one highly specific actionable suggestion"\n'
        '}'
    )

    data = _ask_gemini(prompt)
    if data and "insights" in data:
        result = list(data["insights"])
        if data.get("suggestion"):
            result.append("💡 " + data["suggestion"])
        return {"insights": result, "_source": "gemini"}

    # Deterministic fallback
    result = generate_insights(session)
    result["_source"] = "deterministic"
    return result


# ─── Actions ──────────────────────────────────────────────────────────────────

def generate_action_response(session: dict) -> list:
    payload = _safe_metrics(session)

    prompt = (
        "You are a no-nonsense financial advisor. "
        "Based on this anonymized aggregate profile: "
        + json.dumps(payload)
        + "\n\nGenerate exactly 3 immediately actionable financial steps. "
        "Each action must have a short headline ('problem') and a detailed description ('action') with specific numbers/rupees. "
        "Output strictly as JSON:\n"
        '{"actions": [{"problem": "Reduce Weekend Spend", "action": "Cap your weekend outflow to Rs 2000..."}, ...]}'
    )

    data = _ask_gemini(prompt)
    if data and "actions" in data:
        # Validate format
        valid_actions = [a for a in data["actions"] if isinstance(a, dict) and "problem" in a and "action" in a]
        if len(valid_actions) >= 1:
            return valid_actions[:3]

    # Deterministic fallback
    return generate_actions(session)


def chat_with_advisor(session: dict, message: str, history: list[dict] = []) -> str:
    payload = _safe_metrics(session)
    formatted_history = "\n".join([f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in history[-4:]]) # last 4 messages

    prompt = (
        "You are 'Mirror', a restrictive, elite financial AI advisor. "
        "RULES:\n"
        "1. You ONLY discuss the user's finances based on their aggregated profile. If they ask about non-finance topics (e.g. recipes, code, politics, general history), aggressively refuse and redirect them to their dashboard metrics.\n"
        "2. If asked 'Can I afford X' or 'Can I buy an iPhone for Y', calculate affordability strictly against their 'savings' metric. If 'savings' < cost, strongly say NO, then calculate exactly how many months they must wait using (Cost - Savings) / Math.max((Income - Expenses), 1).\n"
        "3. Keep the tone modern, slightly sassy, but highly analytical.\n\n"
        "USER AGGREGATE PROFILE (DO NOT REVEAL RAW JSON):\n"
        f"{json.dumps(payload)}\n\n"
        "CHAT HISTORY:\n"
        f"{formatted_history}\n\n"
        "NEW MESSAGE FROM USER:\n"
        f"{message}\n\n"
        "Output your response strictly as JSON:\n"
        '{"response": "your final advice text here"}'
    )

    data = _ask_gemini(prompt)
    if data and isinstance(data, dict) and "response" in data:
        return data["response"]
    
    # Fallback if Gemini fails
    return "I'm currently unable to access your live financial stream. Let's focus on the static dashboard metrics."


# ─── Status ───────────────────────────────────────────────────────────────────

def ai_provider_status() -> dict:
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_active = bool(gemini_key and gemini_key != "PASTE_YOUR_NEW_KEY_HERE")
    return {
        "gemini_configured": gemini_active,
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "active_provider": "gemini" if gemini_active else "deterministic",
        "model": "gemini-1.5-flash" if gemini_active else "rule-based",
    }
