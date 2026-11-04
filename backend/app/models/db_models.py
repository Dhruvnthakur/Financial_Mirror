import uuid
import json

from sqlalchemy import Column, DateTime, Float, String, Text
from sqlalchemy.sql import func

from app.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    streak_count = Column(Float, default=0) # using Float or Integer is fine, actually SQLite doesn't strictly enforce but let's use Float or INT. Let's import Integer and use Integer.


class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    profile_json = Column(Text, nullable=False)  # JSON-encoded UserProfile
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, index=True, nullable=False)
    
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    date = Column(String, nullable=True)
    type = Column(String, nullable=False, default="expense")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
