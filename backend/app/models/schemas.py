from typing import Literal

from pydantic import BaseModel, Field


TransactionType = Literal["income", "expense"]


class UserProfile(BaseModel):
    name: str = Field(min_length=1, max_length=100, pattern=r"^[\w\s.,!?'-]+$")
    phone: str = Field(min_length=5, max_length=20, pattern=r"^\+?[\d\s-]+$")
    monthly_income: float = Field(ge=0, le=1_000_000_000.0)
    financial_goal: str = Field(min_length=1, max_length=500)


class SessionStartRequest(BaseModel):
    profile: UserProfile
    auto_clear_on_refresh: bool = True
    session_id: str | None = None


class SessionStartResponse(BaseModel):
    session_id: str
    message: str


class Transaction(BaseModel):
    id: str | None = Field(default=None, max_length=100)
    date: str = Field(max_length=50)
    description: str = Field(max_length=500, pattern=r"^[\w\s.,!?'\"-]*$")
    amount: float = Field(ge=-1_000_000_000.0, le=1_000_000_000.0)
    type: TransactionType = "expense"
    category: str = Field(default="Uncategorized", max_length=100)


class TransactionBatchRequest(BaseModel):
    session_id: str = Field(max_length=100)
    transactions: list[Transaction] = Field(max_length=1000)


class TextInputRequest(BaseModel):
    session_id: str = Field(max_length=100)
    text: str = Field(max_length=10000)


class SessionRequest(BaseModel):
    session_id: str


class PersonalityResponse(BaseModel):
    tag: str
    summary: str
    swot: dict[str, list[str]]
    score: int


class InsightsResponse(BaseModel):
    insights: list[str]
    refined: bool


class ActionsResponse(BaseModel):
    actions: list[dict]


class FullAnalysisResponse(BaseModel):
    tag: str
    summary: str
    swot: dict[str, list[str]]
    insights: list[str]
    actions: list[dict]


class NudgeResponse(BaseModel):
    type: str
    message: str
    whatsapp_ready: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[dict] = []  # Allows contextual convo


class ChatResponse(BaseModel):
    response: str

