from fastapi import APIRouter, HTTPException

from app.models.schemas import SessionRequest, SessionStartRequest, SessionStartResponse, ChatRequest, ChatResponse
from app.services.ai_service import ai_provider_status, chat_with_advisor
from app.store.session_store import session_store

router = APIRouter(tags=["sessions"])


@router.post("/sessions/start", response_model=SessionStartResponse)
def start_session(payload: SessionStartRequest):
    session_id = session_store.create(payload.profile, payload.auto_clear_on_refresh, payload.session_id)
    return {
        "session_id": session_id,
        "message": "Session started. Financial data securely stored locally.",
    }


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = session_store.get_safe(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")
    return {
        "profile": session["profile"],
        "transactions": session["transactions"],
        "privacy": "session-only",
        "ai": ai_provider_status(),
    }


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    deleted = session_store.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")
    return {"deleted": True, "message": "All session data cleared."}


@router.post("/delete-all-data")
def delete_all_data(payload: SessionRequest):
    return delete_session(payload.session_id)


@router.post("/chat", response_model=ChatResponse)
def handle_chat(payload: ChatRequest):
    session = session_store.get_safe(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    response_text = chat_with_advisor(session, payload.message, payload.history)
    return ChatResponse(response=response_text)
