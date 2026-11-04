"""
✅ Added security: Security middleware module.
Contains:
  - SecurityHeadersMiddleware: adds production-safe HTTP headers to every response
  - RateLimiter: simple in-memory sliding-window rate limiter (no Redis needed)
"""

import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


# ---------------------------------------------------------------------------
# ✅ Added security: Secure HTTP headers (Helmet.js equivalent for FastAPI)
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds hardened security headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if "server" in response.headers:
            del response.headers["server"]
        return response


# ---------------------------------------------------------------------------
# ✅ Added security: In-memory sliding-window rate limiter
# ---------------------------------------------------------------------------

class _RateLimitStore:
    """Thread-safe-enough sliding window store (single-process, no threading concerns with asyncio)."""

    def __init__(self):
        # Maps IP -> deque of request timestamps
        self._windows: dict[str, deque] = defaultdict(deque)

    def is_allowed(self, client_ip: str, max_requests: int, window_seconds: int) -> bool:
        now = time.monotonic()
        window = self._windows[client_ip]

        # Drop timestamps outside the window
        cutoff = now - window_seconds
        while window and window[0] < cutoff:
            window.popleft()

        if len(window) >= max_requests:
            return False

        window.append(now)
        return True

    def cleanup(self):
        """Remove empty entries (called periodically)."""
        empty = [ip for ip, w in self._windows.items() if not w]
        for ip in empty:
            del self._windows[ip]


_store = _RateLimitStore()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    ✅ Added security: Rate limits all API routes.
    Defaults: 60 requests per 60 seconds per IP.
    AI/analysis endpoints get a stricter inner limit (20/60s) applied at route level.
    """

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Respect X-Forwarded-For if behind a proxy (trusting first hop only)
        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        # Skip rate limiting for health check and OPTIONS (CORS preflight)
        if request.url.path in ("/", "/docs", "/openapi.json") or request.method == "OPTIONS":
            return await call_next(request)

        if not _store.is_allowed(client_ip, self.max_requests, self.window_seconds):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait before trying again."},
                headers={"Retry-After": str(self.window_seconds)},
            )

        return await call_next(request)


class PayloadSizeMiddleware(BaseHTTPMiddleware):
    """
    ✅ Added security: Rejects requests with a Content-Length exceeding max_size.
    """
    def __init__(self, app, max_size: int = 5 * 1024 * 1024):  # 5MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={"detail": "Payload too large."}
            )
        return await call_next(request)
