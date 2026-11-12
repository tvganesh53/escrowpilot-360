
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox").lower()

if PAYPAL_MODE != "sandbox":
    raise RuntimeError("This development service only supports PayPal Sandbox.")

PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"


def get_paypal_access_token() -> dict:
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError("PayPal credentials are missing from backend/.env")

    try:
        response = httpx.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
            timeout=20.0,
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("access_token"):
            raise RuntimeError("PayPal did not return an access token.")

        return result

    except httpx.HTTPStatusError as exc:
        # Do not log or return credentials or access tokens.
        raise RuntimeError(
            f"PayPal authentication failed (HTTP {exc.response.status_code}). "
            "Check that the Sandbox credentials belong to the same app."
        ) from None
    except httpx.RequestError:
        raise RuntimeError(
            "Could not connect to PayPal. Check your internet connection."
        ) from None

def create_paypal_order(amount: str, currency: str = "USD") -> dict:
    """Create a PayPal Sandbox checkout order."""
    if currency != "USD":
        raise ValueError("Use USD for the initial Sandbox checkout test.")

    try:
        value = f"{float(amount):.2f}"
    except (TypeError, ValueError):
        raise ValueError("Amount must be a valid number.") from None

    if float(value) <= 0:
        raise ValueError("Amount must be greater than zero.")

    token_data = get_paypal_access_token()
    access_token = token_data["access_token"]

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": value,
                }
            }
        ],
        "application_context": {
            "return_url": "http://localhost:5173/paypal/success",
            "cancel_url": "http://localhost:5173/paypal/cancel",
            "user_action": "PAY_NOW",
        },
    }

    try:
        response = httpx.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"PayPal order creation failed (HTTP {exc.response.status_code})."
        ) from None
    except httpx.RequestError:
        raise RuntimeError("Could not connect to PayPal.") from None


def capture_paypal_order(order_id: str) -> dict:
    """Capture a buyer-approved PayPal Sandbox order."""
    if not order_id or not order_id.strip():
        raise ValueError("PayPal order ID is required.")

    token_data = get_paypal_access_token()
    access_token = token_data["access_token"]

    try:
        response = httpx.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"PayPal capture failed (HTTP {exc.response.status_code})."
        ) from None
    except httpx.RequestError:
        raise RuntimeError("Could not connect to PayPal.") from None
def get_paypal_order(order_id: str) -> dict:
    if not order_id or not order_id.strip():
        raise ValueError("PayPal order ID is required.")

    token_data = get_paypal_access_token()

    try:
        response = httpx.get(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}",
            headers={
                "Authorization": f"Bearer {token_data['access_token']}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"PayPal order verification failed (HTTP {exc.response.status_code})."
        ) from None
    except httpx.RequestError:
        raise RuntimeError("Could not connect to PayPal.") from None