from collections import defaultdict
from datetime import datetime

from app.utils.categorizer import DISCRETIONARY_CATEGORIES


def _month_key(value: str) -> str:
    # Try ISO first, then Indian bank formats
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d %b %Y", "%d-%b-%Y", "%d %B %Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(value)[:11].strip(), fmt).strftime("%Y-%m")
        except ValueError:
            continue
    return str(value)[:7] or "Unknown"


def _weekday(value: str) -> int | None:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d-%b-%Y", "%d %B %Y", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(str(value)[:12].strip(), fmt).weekday()
        except ValueError:
            continue
    return None


def build_metrics(session: dict) -> dict:
    transactions = session.get("transactions", [])
    profile = session.get("profile", {})
    monthly_income = float(profile.get("monthly_income") or 0)

    income = sum(item["amount"] for item in transactions if item["type"] == "income")
    expenses = sum(item["amount"] for item in transactions if item["type"] == "expense")
    effective_income = income or monthly_income
    savings = max(effective_income - expenses, 0)
    savings_rate = savings / effective_income if effective_income else 0

    by_category = defaultdict(float)
    by_month = defaultdict(float)
    weekend_spend = 0.0
    weekday_spend = 0.0

    for item in transactions:
        if item["type"] != "expense":
            continue
        by_category[item["category"]] += item["amount"]
        by_month[_month_key(item["date"])] += item["amount"]
        weekday = _weekday(item["date"])
        if weekday is not None and weekday >= 5:
            weekend_spend += item["amount"]
        else:
            weekday_spend += item["amount"]

    discretionary = sum(value for key, value in by_category.items() if key in DISCRETIONARY_CATEGORIES)
    discretionary_ratio = discretionary / expenses if expenses else 0
    expense_ratio = expenses / effective_income if effective_income else 0

    score = 100
    if savings_rate < 0.2:
        score -= int((0.2 - savings_rate) * 120)
    if discretionary_ratio > 0.3:
        score -= int((discretionary_ratio - 0.3) * 80)
    if expense_ratio > 0.85:
        score -= int((expense_ratio - 0.85) * 90)
    if weekend_spend > weekday_spend * 0.45:
        score -= 8

    return {
        "income": round(effective_income, 2),
        "expenses": round(expenses, 2),
        "savings": round(savings, 2),
        "savings_rate": round(savings_rate, 3),
        "expense_ratio": round(expense_ratio, 3),
        "discretionary": round(discretionary, 2),
        "discretionary_ratio": round(discretionary_ratio, 3),
        "by_category": dict(sorted(by_category.items(), key=lambda item: item[1], reverse=True)),
        "by_month": dict(sorted(by_month.items())),
        "weekend_spend": round(weekend_spend, 2),
        "weekday_spend": round(weekday_spend, 2),
        "score": max(0, min(100, score)),
        "transaction_count": len(transactions),
    }


def generate_personality(session: dict) -> dict:
    metrics = build_metrics(session)
    if metrics["savings_rate"] >= 0.3 and metrics["expense_ratio"] < 0.7:
        tag = "Conservative Saver"
    elif metrics["discretionary_ratio"] > 0.38:
        tag = "Impulse Spender"
    elif metrics["expense_ratio"] > 0.9:
        tag = "Paycheck-to-Paycheck Operator"
    elif metrics["by_category"].get("Entertainment", 0) + metrics["by_category"].get("Shopping", 0) > metrics["income"] * 0.25:
        tag = "Lifestyle-Heavy Spender"
    else:
        tag = "Balanced Optimizer"

    summary = (
        f"Your financial health score is {metrics['score']}/100. "
        f"You are currently saving about {round(metrics['savings_rate'] * 100)}% of income, "
        f"while discretionary spending is about {round(metrics['discretionary_ratio'] * 100)}% of expenses. "
        "This profile is workable, but the biggest gains will come from reducing repeatable leaks rather than tracking every small purchase."
    )

    swot = {
        "strengths": [
            "You have enough transaction visibility to identify behavior patterns.",
            "Your spending can be improved with targeted category limits instead of broad restrictions.",
        ],
        "weaknesses": [
            "Savings rate is below the recommended 20% benchmark." if metrics["savings_rate"] < 0.2 else "Savings behavior is present but still needs consistency.",
            "Discretionary categories take a meaningful share of monthly expenses.",
        ],
        "opportunities": [
            "Automate savings immediately after income is received.",
            "Set weekend and discretionary category limits for the next 30 days.",
        ],
        "threats": [
            "Small recurring and lifestyle expenses can silently reduce long-term savings.",
            "If expenses keep rising faster than income, emergency savings will remain fragile.",
        ],
    }

    return {"tag": tag, "summary": summary, "swot": swot, "score": metrics["score"]}


def generate_insights(session: dict) -> dict:
    metrics = build_metrics(session)
    refined = int(session.get("insight_calls", 0)) > 1
    top_category = next(iter(metrics["by_category"]), "No spending category")
    top_amount = metrics["by_category"].get(top_category, 0)

    insights = [
        f"Your highest expense category is {top_category} at Rs {int(top_amount)}, which is the first area to audit.",
        f"Your savings rate is {round(metrics['savings_rate'] * 100)}%, compared with a practical target of at least 20%.",
        f"Discretionary spending is {round(metrics['discretionary_ratio'] * 100)}% of total expenses, so lifestyle choices are materially affecting your outcome.",
    ]

    if metrics["weekend_spend"] > metrics["weekday_spend"] * 0.45:
        insights.append("Your weekend spending trend is higher than usual, which suggests unplanned social or food expenses are a repeat pattern.")

    months = list(metrics["by_month"].items())
    if len(months) >= 2 and months[-1][1] > months[0][1] * 1.1:
        insights.append("Your expenses show a rising trend across the available months.")

    if refined:
        insights.append(
            "Refined session insight: after combining category, timing, and savings behavior, the main issue is not one large purchase; it is repeated discretionary leakage."
        )

    return {"insights": insights[:5], "refined": refined}


def generate_actions(session: dict) -> list:
    metrics = build_metrics(session)
    actions = []

    if metrics["discretionary"] > 0:
        reduction = max(1000, round(metrics["discretionary"] * 0.2 / 500) * 500)
        actions.append({
            "problem": "High Discretionary Spending",
            "action": f"Reduce discretionary spending by Rs {int(reduction)}/month, starting with the highest category in your dashboard."
        })

    target_savings = max(1500, round(metrics["income"] * 0.2 / 500) * 500)
    current_savings = metrics["savings"]
    gap = max(target_savings - current_savings, 0)
    actions.append({
        "problem": "Insufficient Savings Buffer",
        "action": f"Set an automatic savings transfer of Rs {int(max(gap, target_savings * 0.4))} immediately after income is received."
    })

    recurring_like = metrics["by_category"].get("Entertainment", 0) + metrics["by_category"].get("Bills & Utilities", 0)
    review_amount = max(500, round(recurring_like * 0.15 / 500) * 500)
    actions.append({
        "problem": "Recurring Subscription Leakage",
        "action": f"Review subscriptions and recurring bills this week; target at least Rs {int(review_amount)} in monthly cuts."
    })

    if metrics["weekend_spend"] > 0:
        weekend_cap = max(1000, round(metrics["weekend_spend"] * 0.75 / 500) * 500)
        actions.append({
            "problem": "Uncapped Weekend Expenditure",
            "action": f"Put a weekend spending cap of Rs {int(weekend_cap)} for the next two weekends."
        })

    return actions[:3]


def generate_nudge(session: dict) -> dict:
    metrics = build_metrics(session)
    top_category = next(iter(metrics["by_category"]), "discretionary expenses")
    top_amount = metrics["by_category"].get(top_category, 0)

    if metrics["discretionary_ratio"] >= 0.35:
        message = f"You have used a high share of your budget on {top_category}. Review this before your next discretionary purchase."
        nudge_type = "Budget alert"
    elif metrics["weekend_spend"] > metrics["weekday_spend"] * 0.45:
        message = "Your weekend spending trend is higher than usual. Set a limit before the weekend starts."
        nudge_type = "Behavior alert"
    else:
        cut = max(1000, round(top_amount * 0.2 / 500) * 500)
        message = f"Consider reducing Rs {int(cut)} from {top_category} this month and move it to savings."
        nudge_type = "Action reminder"

    return {
        "type": nudge_type,
        "message": message,
        "whatsapp_ready": f"Financial Mirror: {message}",
    }
