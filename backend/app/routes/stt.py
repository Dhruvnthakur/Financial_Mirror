"""
Smallest.ai Pulse STT endpoint — proxies audio from the frontend
to waves-api.smallest.ai so the API key never touches the browser.
"""
import os

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(tags=["stt"])

PULSE_URL = "https://waves-api.smallest.ai/api/v1/pulse/get_text"
TIMEOUT = 30.0


def _get_key() -> str:
    key = os.getenv("SMALLEST_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=503,
            detail="SMALLEST_API_KEY is not configured on the server.",
        )
    return key


@router.post("/stt/transcribe")
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (wav/webm/mp3/ogg)"),
):
    """
    Accepts raw audio from the browser and transcribes it via Smallest.ai Pulse STT.
    Returns { "text": "..." }.
    """
    api_key = _get_key()
    audio_bytes = await file.read()

    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is too short or empty.")

    # Detect content type from upload
    content_type = file.content_type or "audio/wav"
    # Normalise webm to audio/webm
    if "webm" in content_type or (file.filename or "").endswith(".webm"):
        content_type = "audio/webm"
    elif "ogg" in content_type:
        content_type = "audio/ogg"
    elif "mp3" in content_type or "mpeg" in content_type:
        content_type = "audio/mpeg"
    else:
        content_type = "audio/wav"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                PULSE_URL,
                params={"language": "en"},
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": content_type,
                },
                content=audio_bytes,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Pulse STT error: {response.status_code} — {response.text[:200]}",
            )

        data = response.json()
        # Pulse returns { "text": "...", ... }
        text = data.get("text") or data.get("transcript") or ""
        return {"text": text.strip(), "raw": data}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Pulse STT timed out.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error: {exc}")
