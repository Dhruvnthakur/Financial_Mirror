import json
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

from app.models.schemas import Transaction, UserProfile


class SessionStore:
    """Hybrid store: session metadata and transactions persisted in SQLite, 
    with in-memory cache for fast access. Sessions survive server restarts."""

    def __init__(self, max_transactions=1000, ttl_seconds=3600):
        self._sessions: dict[str, dict] = {}
        self.max_transactions = max_transactions
        self.ttl_seconds = ttl_seconds

    def _get_db(self):
        from app.database import SessionLocal
        return SessionLocal()

    def _db_save_session(self, session_id: str, profile: dict):
        """Persist session profile to SQLite."""
        from app.models.db_models import SessionModel
        db = self._get_db()
        try:
            existing = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if not existing:
                db.add(SessionModel(id=session_id, profile_json=json.dumps(profile)))
                db.commit()
        finally:
            db.close()

    def _db_resurrect_session(self, session_id: str) -> bool:
        """Try to reconstruct session from DB if not in memory. Returns True if successful."""
        from app.models.db_models import SessionModel
        db = self._get_db()
        try:
            record = db.query(SessionModel).filter(SessionModel.id == session_id).first()
            if record:
                self._sessions[session_id] = {
                    "profile": json.loads(record.profile_json),
                    "transactions": [],
                    "created_at": record.created_at.isoformat() if record.created_at else datetime.now(timezone.utc).isoformat(),
                    "analysis_calls": 0,
                    "insight_calls": 0,
                    "auto_clear_on_refresh": True,
                }
                return True
            return False
        finally:
            db.close()

    def _db_get_transactions(self, session_id: str) -> list[dict]:
        """Fetch transactions from SQLite for a session."""
        from app.models.db_models import TransactionModel
        db = self._get_db()
        try:
            records = db.query(TransactionModel).filter(
                TransactionModel.session_id == session_id
            ).order_by(TransactionModel.created_at.desc()).all()
            return [
                {
                    "id": tx.id,
                    "amount": tx.amount,
                    "category": tx.category,
                    "description": tx.description or "",
                    "date": tx.date or "",
                    "type": tx.type,
                }
                for tx in records
            ]
        finally:
            db.close()

    def create(self, profile: UserProfile, auto_clear_on_refresh: bool = True, session_id: str | None = None) -> str:
        session_id = session_id or str(uuid4())
        profile_dict = profile.model_dump()
        
        existing_txns = []
        if session_id in self._sessions:
            existing_txns = self._sessions[session_id].get("transactions", [])
            
        self._sessions[session_id] = {
            "profile": profile_dict,
            "transactions": existing_txns,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "analysis_calls": 0,
            "insight_calls": 0,
            "auto_clear_on_refresh": auto_clear_on_refresh,
        }
        # Persist to DB for resurrection across restarts
        self._db_save_session(session_id, profile_dict)
        return session_id

    def exists(self, session_id: str) -> bool:
        if session_id in self._sessions:
            return True
        # Try to resurrect from DB
        return self._db_resurrect_session(session_id)

    def get(self, session_id: str) -> dict:
        if session_id not in self._sessions:
            # Try resurrect from DB before giving up
            if not self._db_resurrect_session(session_id):
                raise KeyError("Session not found or already cleared.")

        session = self._sessions[session_id]
        # Always hydrate transactions fresh from DB
        session["transactions"] = self._db_get_transactions(session_id)
        return session

    def get_safe(self, session_id: str) -> dict | None:
        try:
            return deepcopy(self.get(session_id))
        except KeyError:
            return None

    def add_transactions(self, session_id: str, transactions: list[Transaction]) -> list[dict]:
        from app.models.db_models import TransactionModel

        if not self.exists(session_id):
            raise KeyError("Session not found or already cleared.")

        db = self._get_db()
        try:
            current_count = db.query(TransactionModel).filter(
                TransactionModel.session_id == session_id
            ).count()
            if current_count + len(transactions) > self.max_transactions:
                raise ValueError(f"Cannot exceed maximum of {self.max_transactions} transactions per session.")

            db_objects = []
            for t in transactions:
                obj = TransactionModel(
                    id=t.id or str(uuid4()),
                    session_id=session_id,
                    amount=abs(float(t.amount)),
                    category=t.category or "Other",
                    description=t.description or "",
                    date=t.date or str(datetime.now(timezone.utc).date()),
                    type=t.type or "expense",
                )
                db_objects.append(obj)

            db.add_all(db_objects)
            db.commit()
        finally:
            db.close()

        return self._db_get_transactions(session_id)

    def replace_transactions(self, session_id: str, transactions: list[Transaction]) -> list[dict]:
        from app.models.db_models import TransactionModel

        if not self.exists(session_id):
            raise KeyError("Session not found or already cleared.")

        db = self._get_db()
        try:
            db.query(TransactionModel).filter(
                TransactionModel.session_id == session_id
            ).delete()
            db.commit()
        finally:
            db.close()

        return self.add_transactions(session_id, transactions)

    def increment(self, session_id: str, key: str) -> int:
        if session_id not in self._sessions:
            self._db_resurrect_session(session_id)
        session = self._sessions.get(session_id, {})
        session[key] = int(session.get(key, 0)) + 1
        self._sessions[session_id] = session
        return session[key]

    def delete(self, session_id: str) -> bool:
        from app.models.db_models import SessionModel, TransactionModel

        db = self._get_db()
        try:
            db.query(TransactionModel).filter(TransactionModel.session_id == session_id).delete()
            db.query(SessionModel).filter(SessionModel.id == session_id).delete()
            db.commit()
        finally:
            db.close()

        return self._sessions.pop(session_id, None) is not None


session_store = SessionStore()
