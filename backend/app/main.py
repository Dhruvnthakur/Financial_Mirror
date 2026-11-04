from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables from .env file (local dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.routes import analysis, auth, data, sessions, stt
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware, PayloadSizeMiddleware

app = FastAPI(
    title="Financial Mirror API",
    description="Session-only AI financial checkup backend for the hackathon MVP.",
    version="0.1.0",
)

from app.database import engine
from app.models.db_models import Base

Base.metadata.create_all(bind=engine)

# Reverted global exception handler since FastAPI natively hides 500 tracebacks from clients.

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(PayloadSizeMiddleware, max_size=5 * 1024 * 1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(stt.router)
app.include_router(sessions.router)
app.include_router(data.router)
app.include_router(analysis.router)


@app.get("/")
def health_check():
    return {
        "name": "Financial Mirror API",
        "status": "ok",
        "privacy": "session-only; no permanent financial data storage",
    }
 




