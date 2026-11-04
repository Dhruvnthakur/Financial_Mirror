import urllib.request
import json
import urllib.error

url = "http://localhost:8000/sessions/start"
payload = {
    "profile": {
        "name": "Test User",
        "phone": "1234567890",
        "monthly_income": 5000,
        "financial_goal": "Save money"
    },
    "auto_clear_on_refresh": True
}
data = json.dumps(payload).encode("utf-8")
headers = {
    "Origin": "http://localhost:5173",
    "Content-Type": "application/json"
}

req = urllib.request.Request(url, data=data, headers=headers)
try:
    response = urllib.request.urlopen(req)
    print("Status:", response.status)
    print("Headers:", dict(response.headers))
    print("Body:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Headers:", dict(e.headers))
    print("Body:", e.read().decode())
except Exception as e:
    print("Error:", e)
