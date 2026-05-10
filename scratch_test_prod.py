import requests
import json
from datetime import datetime, timedelta

base_url = "https://trademind.bot"

print(f"Testing Production Webhooks on {base_url}")

# 1. Test Activation Webhook
print("\n1 Firing membership.activated...")
now_iso = datetime.utcnow().isoformat() + "Z"
end_iso = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"

act_data = {
    "type": "membership.activated",
    "data": {
        "id": "mem_test001",
        "status": "active",
        "joined_at": now_iso,
        "renewal_period_end": end_iso,
        "plan_id": "plan_WLvO78Qzg6Rc8",
        "user": {
            "id": "user_whoptest001",
            "username": "testtrader",
            "name": "Test Trader",
            "email": "testtrader@example.com"
        },
        "member": { "id": "mber_test001" }
    }
}

try:
    res1 = requests.post(f"{base_url}/api/whop/webhook", json=act_data)
    print(f"Response: {res1.status_code} {res1.text}")
except Exception as e:
    print("Error:", e)

# 2. Test Deactivation Webhook
print("\n2 Firing membership.deactivated...")
deact_data = {
    "type": "membership.deactivated",
    "data": {
        "id": "mem_test001",
        "status": "expired",
        "user": {
            "id": "user_whoptest001",
            "email": "testtrader@example.com",
            "name": "Test Trader"
        }
    }
}

try:
    res2 = requests.post(f"{base_url}/api/whop/webhook", json=deact_data)
    print(f"Response: {res2.status_code} {res2.text}")
except Exception as e:
    print("Error:", e)

print("\nWebhooks fired successfully!")
