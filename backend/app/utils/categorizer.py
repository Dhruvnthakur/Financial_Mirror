import json
import os

from app.models.schemas import Transaction


CATEGORY_RULES = {
    "Food & Dining": [
        "swiggy", "zomato", "restaurant", "cafe", "food", "dining", "pizza",
        "coffee", "tea", "boba", "burger", "mcdonalds", "kfc", "subway",
        "biryani", "chai", "dhaba", "eat", "ate", "meal", "lunch", "dinner",
        "breakfast", "bakery", "juice", "snack", "canteen", "mess", "hotel",
        "thali", "dosa", "idli", "paratha", "maggi", "noodles", "chicken",
        "dominos", "dunkin", "starbucks", "blinkit", "zepto",
    ],
    "Transport": [
        "uber", "ola", "metro", "fuel", "petrol", "diesel", "cab", "taxi",
        "bus", "auto", "rickshaw", "rapido", "train", "railway", "irctc",
        "flight", "airline", "indigo", "spicejet", "airasia", "toll",
        "parking", "travel", "voyage", "trip", "journey", "commute",
        "drove", "ride", "bike", "scooter", "ferry", "boat",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "shopping", "store", "mall",
        "meesho", "ajio", "nykaa", "clothes", "clothing", "shirt", "shoes",
        "dress", "jeans", "fashion", "accessories", "bag", "watch",
        "electronics", "laptop", "phone", "mobile", "gadget", "appliance",
        "furniture", "decor", "ikea", "croma", "reliance digital",
    ],
    "Entertainment": [
        "netflix", "spotify", "prime", "movie", "cinema", "hotstar",
        "game", "gaming", "disney", "jiocinema", "youtube", "concert",
        "event", "ticket", "amusement", "bowling", "arcade", "club",
        "bar", "pub", "drinks", "alcohol", "beer", "wine", "party",
    ],
    "Bills & Utilities": [
        "electricity", "wifi", "internet", "mobile", "bill", "utility",
        "recharge", "broadband", "dth", "airtel", "jio", "bsnl", "vodafone",
        "vi", "tata sky", "water", "gas", "lpg", "maintenance charge",
        "society", "subscription",
    ],
    "Rent & Housing": [
        "rent", "maintenance", "housing", "flat", "apartment", "pg",
        "hostel", "landlord", "deposit", "lease", "accommodate",
    ],
    "Health": [
        "pharmacy", "doctor", "hospital", "medicine", "clinic",
        "gym", "fitness", "yoga", "health", "dental", "medical",
        "apollo", "1mg", "netmeds", "chemist", "physiotherapy", "lab",
        "diagnostic", "test", "checkup", "surgery", "consult",
    ],
    "Education": [
        "course", "tuition", "book", "college", "school", "udemy",
        "coursera", "byju", "unacademy", "coaching", "class", "exam",
        "certification", "workshop", "seminar", "stationery", "notebook",
    ],
    "Savings & Investments": [
        "sip", "mutual fund", "fd", "deposit", "investment", "savings",
        "zerodha", "groww", "stocks", "equity", "gold", "lic",
        "insurance", "premium", "ppf", "nps", "elss",
    ],
    "Income": [
        "salary", "stipend", "freelance", "income", "credited",
        "payroll", "bonus", "refund", "credit", "received", "payment received",
        "earned", "wages",
    ],
}

DISCRETIONARY_CATEGORIES = {"Food & Dining", "Shopping", "Entertainment"}


def categorize(description: str, transaction_type: str = "expense") -> str:
    if transaction_type == "income":
        return "Income"
    text = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(keyword in text for keyword in keywords):
            return category
    return "Other"


def _gemini_categorize(uncategorized: list) -> dict:
    """Use Gemini to batch-categorize unknown transactions. Returns id->category map."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("PASTE"):
        return {}
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"},
        )
        payload = [{"id": i, "desc": t.description} for i, t in enumerate(uncategorized)]
        valid_cats = list(CATEGORY_RULES.keys()) + ["Other"]
        prompt = (
            f"Categorize each transaction description into exactly one of these categories: {valid_cats}. "
            "Use context clues: 'food', 'ate', 'restaurant', 'cafe' → Food & Dining; "
            "'cab', 'uber', 'travel', 'petrol' → Transport; "
            "'netflix', 'movie', 'game' → Entertainment; etc. "
            "If truly unsure, use 'Other'. "
            "Respond ONLY as JSON: {\"0\": \"Category\", \"1\": \"Category\", ...} "
            f"Data: {json.dumps(payload)}"
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        return {}


def normalize_transactions(transactions: list[Transaction]) -> list[Transaction]:
    normalized = []
    uncategorized = []

    for transaction in transactions:
        category = transaction.category
        if not category or category in ("Uncategorized", "Other", ""):
            category = categorize(transaction.description, transaction.type)

        if category == "Other":
            uncategorized.append(transaction)
        else:
            normalized.append(transaction.model_copy(update={"category": category}))

    if uncategorized:
        # Try Gemini first (preferred), then fall back to "Other"
        result_map = _gemini_categorize(uncategorized)
        for i, t in enumerate(uncategorized):
            cat = result_map.get(str(i), result_map.get(i, "Other"))
            if cat not in CATEGORY_RULES and cat != "Income":
                cat = "Other"
            normalized.append(t.model_copy(update={"category": cat}))

    return normalized
