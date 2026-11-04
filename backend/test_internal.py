from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

response = client.post(
    "/sessions/start",
    json={
        "profile": {
            "name": "Test User",
            "phone": "1234567890",
            "monthly_income": 5000,
            "financial_goal": "Save money"
        },
        "auto_clear_on_refresh": True
    }
)
print(response.status_code)
print(response.json())
