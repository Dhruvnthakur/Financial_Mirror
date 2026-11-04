from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.schemas import TextInputRequest, TransactionBatchRequest
from app.store.session_store import session_store
from app.utils.categorizer import normalize_transactions
from app.utils.parsers import parse_csv_bytes, parse_pdf_bytes, parse_text_to_transactions

router = APIRouter(tags=["data"])


@router.post("/transactions")
def add_transactions(payload: TransactionBatchRequest):
    if not session_store.exists(payload.session_id):
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")
    normalized = normalize_transactions(payload.transactions)
    try:
        transactions = session_store.add_transactions(payload.session_id, normalized)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"transactions": transactions, "count": len(transactions)}


@router.post("/transactions/replace")
def replace_transactions(payload: TransactionBatchRequest):
    if not session_store.exists(payload.session_id):
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")
    normalized = normalize_transactions(payload.transactions)
    try:
        transactions = session_store.replace_transactions(payload.session_id, normalized)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"transactions": transactions, "count": len(transactions)}


@router.post("/parse-text-input")
def parse_text_input(payload: TextInputRequest):
    if not session_store.exists(payload.session_id):
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")
    transactions = parse_text_to_transactions(payload.text)
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions could be parsed from the text.")
    try:
        stored = session_store.add_transactions(payload.session_id, normalize_transactions(transactions))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"transactions": stored, "parsed_count": len(transactions)}


@router.post("/upload-statement")
async def upload_statement(session_id: str = Form(...), file: UploadFile = File(...)):
    if not session_store.exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found or already cleared.")

    content = await file.read()
    filename = file.filename.lower()
    if filename.endswith(".csv"):
        transactions = parse_csv_bytes(content)
    elif filename.endswith(".pdf"):
        transactions = parse_pdf_bytes(content)
    else:
        raise HTTPException(status_code=400, detail="Only CSV and PDF uploads are supported.")

    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions could be parsed from this file.")
    try:
        stored = session_store.add_transactions(session_id, normalize_transactions(transactions))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"transactions": stored, "parsed_count": len(transactions)}
