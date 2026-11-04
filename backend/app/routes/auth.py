import hashlib
import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.database import SessionLocal
from app.models.db_models import UserModel
from app.services.auth_service import create_access_token

router = APIRouter(tags=["auth"])


class SignUpRequest(BaseModel):
    email: str = Field(pattern=r"^[^@]+@[^@]+\.[^@]+$", max_length=320)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(default="", max_length=100)


class SignInRequest(BaseModel):
    email: str = Field(pattern=r"^[^@]+@[^@]+\.[^@]+$", max_length=320)
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    name: str
    streak: int = 0


def _hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 with random salt — no external dependency."""
    salt = os.urandom(32)
    # Reduced iterations from 260,000 to 2,600 for instant hackathon load times
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 2600)
    return salt.hex() + ":" + key.hex()


def _verify_password(plain: str, stored: str) -> bool:
    try:
        salt_hex, key_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        
        # We exclusively use the fast path now to prevent GIL deadlocks
        key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, 2600)
        return key.hex() == key_hex
    except Exception:
        return False


@router.post("/auth/signup", response_model=AuthResponse)
def signup(payload: SignUpRequest):
    db = SessionLocal()
    try:
        existing = db.query(UserModel).filter(UserModel.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        user = UserModel(
            email=payload.email,
            hashed_password=_hash_password(payload.password),
            name=payload.name or payload.email.split("@")[0],
            last_login=datetime.now(timezone.utc),
            streak_count=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id, user.email)
        return AuthResponse(token=token, user_id=user.id, email=user.email, name=user.name or "", streak=1)
    finally:
        db.close()


@router.post("/auth/signin", response_model=AuthResponse)
def signin(payload: SignInRequest):
    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.email == payload.email).first()
        if not user or not _verify_password(payload.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password.")

        now = datetime.now(timezone.utc)
        if not user.last_login:
            user.streak_count = 1
        else:
            try:
                # Handle timezone-aware/naive mismatches depending on sqlite driver safely
                ll_date = user.last_login.date()
                diff = now.date() - ll_date
                if diff.days == 1:
                    user.streak_count = (user.streak_count or 0) + 1
                elif diff.days > 1:
                    user.streak_count = 1
            except:
                user.streak_count = 1
                
        user.last_login = now
        db.commit()

        token = create_access_token(user.id, user.email)
        return AuthResponse(
            token=token, 
            user_id=user.id, 
            email=user.email, 
            name=user.name or "", 
            streak=int(user.streak_count or 1)
        )
    finally:
        db.close()


@router.get("/auth/me")
def get_me(token: str):
    from app.services.auth_service import decode_token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
        
    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.id == payload["sub"]).first()
        streak = int(user.streak_count) if user and user.streak_count else 0
        return {"user_id": payload["sub"], "email": payload["email"], "streak": streak}
    finally:
        db.close()

@router.get("/admin/trigger-whatsapp")
def trigger_whatsapp_reminders():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=48)
        dormant_users = db.query(UserModel).filter(UserModel.last_login < cutoff).all()
        
        print("\n" + "*"*60)
        print("     WHATSAPP RETENTION ENGINE TRIGGERED     ")
        print("*"*60)
        
        count = 0
        for u in dormant_users:
            if u.streak_count and u.streak_count > 1:
                print(f"[WHATSAPP API] 📱 Message queued to {u.email} (Streak: {int(u.streak_count)}):")
                print(f"  \"Hey {u.name}! Your {int(u.streak_count)}-day Financial Mirror streak is freezing over! Log in today to keep it hot 🔥\"\n")
                count += 1
            else:
                print(f"[WHATSAPP API] 📱 Message queued to {u.email}:")
                print(f"  \"Hey {u.name}, missing your insights? Come back to your Financial Mirror!\"\n")
                count += 1
                
        print(f"--- Successfully retargeted {count} dormant users via WhatsApp ---\n")
        return {"message": f"Triggered reminders for {count} users.", "count": count}
    finally:
        db.close()


import random

class OtpRequest(BaseModel):
    phone: str

class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str

_otp_store = {}

@router.post("/auth/send-otp")
def send_otp(payload: OtpRequest):
    if not payload.phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")
    otp = str(random.randint(100000, 999999))
    _otp_store[payload.phone] = otp
    
    # Simulate sending SMS by printing prominently to console
    print("\n" + "="*50)
    print(f"[SECURITY] OTP for {payload.phone} is: {otp}")
    print("="*50 + "\n")
    
    return {"message": "OTP sent successfully"}


@router.post("/auth/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    stored_otp = _otp_store.get(payload.phone)
    if not stored_otp or stored_otp != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    # Clear OTP after successful use
    del _otp_store[payload.phone]
    return {"message": "OTP verified successfully"}

