import csv
import io
import re
from datetime import date, datetime

import pandas as pd

from app.models.schemas import Transaction
from app.utils.categorizer import categorize


DATE_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})")
AMOUNT_PATTERN = re.compile(r"(?:rs\.?|inr|₹)?\s*(-?\d+(?:,\d{3})*(?:\.\d{1,2})?)", re.IGNORECASE)

# Broad set of date formats used by Indian banks
DATE_FORMATS = [
    "%d-%m-%Y",   # 01-03-2026 (ICICI, HDFC)
    "%d/%m/%Y",   # 01/03/2026
    "%Y-%m-%d",   # 2026-03-01 (ISO)
    "%m/%d/%Y",   # 03/01/2026 (US)
    "%d-%b-%Y",   # 01-Mar-2026
    "%d %b %Y",   # 1 Jan 2012 (SBI)
    "%d %B %Y",   # 1 January 2026
    "%d-%m-%y",   # 01-03-26
    "%d/%m/%y",   # 01/03/26
    "%b %d, %Y",  # Jan 01, 2026
]

# Description field: strip any char not in the allowed set before passing to Pydantic
_DESC_UNSAFE = re.compile(r"[^\w\s.,!?'\"\-]")


def _safe_description(text: str) -> str:
    """Strip characters that fail the Pydantic description regex."""
    cleaned = _DESC_UNSAFE.sub(" ", str(text))
    # Collapse multiple spaces
    cleaned = re.sub(r" {2,}", " ", cleaned).strip()
    return cleaned[:499] or "Transaction"


def _clean_amount(value) -> float:
    """Parse amount strings robustly."""
    if value is None:
        return 0.0
    try:
        if pd.isna(value):
            return 0.0
    except (TypeError, ValueError):
        pass
    cleaned = str(value).replace(",", "").replace("₹", "").replace("INR", "").strip()
    if not cleaned or cleaned in ("-", ""):
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _normalize_date(value: str) -> str:
    """Try to parse and reformat a date string to YYYY-MM-DD. Falls back to original."""
    raw = str(value).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw  # Return as-is if unparseable


def _detect_income_keywords(description: str) -> bool:
    """Quick check if description looks like income/salary."""
    keywords = {"salary", "stipend", "freelance", "income", "credited", "payroll",
                "bonus", "interest", "refund", "cashback", "dividend", "neft cr",
                "imps cr", "rtgs cr", "credit", "neft in", "transfer in"}
    desc_lower = description.lower()
    return any(kw in desc_lower for kw in keywords)


def dataframe_to_transactions(df: pd.DataFrame) -> list[Transaction]:
    # Normalize column names: lowercase, strip whitespace, collapse internal spaces
    df.columns = [re.sub(r"\s+", " ", str(c).strip().lower()) for c in df.columns]
    transactions = []

    for _, row in df.iterrows():
        # --- DATE ---
        date_value = (
            row.get("date")
            or row.get("txn date")
            or row.get("transaction date")
            or row.get("value date")
            or row.get("posted date")
            or str(date.today())
        )
        date_str = _normalize_date(str(date_value))

        # --- DESCRIPTION ---
        raw_desc = (
            row.get("description")
            or row.get("narration")
            or row.get("details")
            or row.get("merchant")
            or row.get("particulars")
            or row.get("remarks")
            or "Transaction"
        )
        description = _safe_description(str(raw_desc))

        # --- AMOUNT + TYPE ---
        # First look for a single unified amount column
        raw_amount_col = row.get("amount") or row.get("amt")
        explicit_type = row.get("type") or row.get("transaction type") or row.get("cr/dr") or row.get("dr/cr")

        if raw_amount_col is not None and _clean_amount(raw_amount_col) != 0.0:
            amount_val = _clean_amount(raw_amount_col)
            if explicit_type:
                t = str(explicit_type).strip().lower()
                if t in {"cr", "credit", "income", "deposit"}:
                    transaction_type = "income"
                else:
                    transaction_type = "expense"
            else:
                # Negative amount or income keyword
                if amount_val < 0 or _detect_income_keywords(description):
                    transaction_type = "income" if amount_val > 0 or _detect_income_keywords(description) else "expense"
                else:
                    transaction_type = "expense"
            amount = abs(amount_val)
        else:
            # Bank-style split Debit / Credit columns
            debit_val = _clean_amount(
                row.get("debit") or row.get("dr") or row.get("withdrawal") or row.get("debit amount") or 0
            )
            credit_val = _clean_amount(
                row.get("credit") or row.get("cr") or row.get("deposit") or row.get("credit amount") or 0
            )

            if credit_val > 0 and debit_val == 0:
                amount = credit_val
                transaction_type = "income"
            elif debit_val > 0 and credit_val == 0:
                amount = debit_val
                transaction_type = "expense"
            elif credit_val > 0 and debit_val > 0:
                # Both filled (unusual): treat net
                amount = abs(credit_val - debit_val)
                transaction_type = "income" if credit_val > debit_val else "expense"
            else:
                continue  # Both zero → skip (opening balance rows etc.)

        if amount == 0:
            continue

        # --- CATEGORY ---
        existing_category = row.get("category") or ""
        if existing_category and str(existing_category).strip() not in ("", "nan", "None", "Uncategorized"):
            category = str(existing_category).strip()
        else:
            category = categorize(description, transaction_type)

        try:
            transactions.append(
                Transaction(
                    date=date_str,
                    description=description,
                    amount=amount,
                    type=transaction_type,
                    category=category,
                )
            )
        except Exception:
            # If Pydantic still rejects, skip this row silently
            continue

    return transactions


def parse_csv_bytes(content: bytes) -> list[Transaction]:
    # Try common encodings
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = content.decode("utf-8", errors="replace")

    # Skip lines that are clearly metadata (not part of the table)
    # Heuristic: find the header row (contains at least 2 comma-separated known keywords)
    HEADER_KEYWORDS = {"date", "amount", "debit", "credit", "description", "narration",
                       "balance", "txn", "transaction", "dr", "cr", "particulars"}
    lines = text.splitlines()
    start_line = 0
    for i, line in enumerate(lines):
        cols = [c.strip().lower() for c in line.split(",")]
        if sum(1 for c in cols if any(kw in c for kw in HEADER_KEYWORDS)) >= 2:
            start_line = i
            break

    trimmed = "\n".join(lines[start_line:])

    try:
        sample = trimmed[:2048]
        delimiter = csv.Sniffer().sniff(sample).delimiter if sample.strip() else ","
    except csv.Error:
        delimiter = ","

    df = pd.read_csv(io.StringIO(trimmed), delimiter=delimiter, skipinitialspace=True)
    return dataframe_to_transactions(df)


def parse_pdf_bytes(content: bytes) -> list[Transaction]:
    import pdfplumber

    rows = []
    detected_header = None

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if len(table) < 2:
                    continue

                # Find the real header row (the one containing date/debit/credit keywords)
                header_idx = 0
                HEADER_KEYWORDS = {"date", "debit", "credit", "amount", "description",
                                   "narration", "balance", "txn", "dr", "cr"}
                for idx, candidate in enumerate(table):
                    candidate_low = [str(c or "").strip().lower() for c in candidate]
                    if sum(1 for c in candidate_low if any(kw in c for kw in HEADER_KEYWORDS)) >= 2:
                        header_idx = idx
                        break

                header = [str(c or "").strip() for c in table[header_idx]]
                # Replace empty header cells with col_N
                header = [h if h else f"col_{i}" for i, h in enumerate(header)]
                detected_header = header

                for row in table[header_idx + 1:]:
                    if row:
                        rows.append(dict(zip(header, row, strict=False)))

    if not rows:
        # Fallback: try tabula-py for complex PDFs
        try:
            import tabula
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            dfs = tabula.read_pdf(
                tmp_path, pages="all", multiple_tables=True, silent=True,
                pandas_options={"dtype": str}
            )
            os.remove(tmp_path)

            if dfs:
                combined = pd.concat(dfs, ignore_index=True)
                return dataframe_to_transactions(combined)
        except Exception:
            pass
        return []

    return dataframe_to_transactions(pd.DataFrame(rows))


def parse_text_to_transactions(text: str) -> list[Transaction]:
    transactions = []
    for line in [item.strip() for item in text.splitlines() if item.strip()]:
        parts = [part.strip() for part in line.split(",")]
        if len(parts) >= 3:
            date_value = _normalize_date(parts[0])
            description = _safe_description(parts[1])
            amount_value = parts[2]
            category = parts[3] if len(parts) > 3 else ""
            amount = _clean_amount(amount_value)
            transaction_type = "income" if _detect_income_keywords(description) else "expense"
        else:
            date_match = DATE_PATTERN.search(line)
            amount_match = AMOUNT_PATTERN.search(line)
            if not amount_match:
                continue
            date_value = _normalize_date(date_match.group(1)) if date_match else str(date.today())
            amount = _clean_amount(amount_match.group(1))
            description = _safe_description(
                DATE_PATTERN.sub("", line).replace(amount_match.group(0), "").strip(" ,-")
            )
            category = ""
            transaction_type = "income" if _detect_income_keywords(line) else "expense"

        if amount == 0:
            continue

        try:
            transactions.append(
                Transaction(
                    date=date_value,
                    description=description or "Text transaction",
                    amount=abs(amount),
                    type=transaction_type,
                    category=category or categorize(description, transaction_type),
                )
            )
        except Exception:
            continue

    return transactions
