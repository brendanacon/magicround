"""
Etsy email monitor.

Polls Gmail for new Etsy order-confirmation emails and triggers
a Google Sheet update for each new sale detected.

Uses the Gmail API with OAuth2 credentials. On first run it will
open a browser for consent; afterwards it uses a stored token.
"""

import os
import json
import re
import time
import logging
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from sheets_updater import increment_sales

logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.modify"]

TOKEN_FILE = "gmail_token.json"

# Etsy order-confirmation emails typically come from this sender.
# Adjust if your notifications differ.
ETSY_SENDER = os.environ.get("ETSY_SENDER_EMAIL", "transaction@etsy.com")

# Label to apply to processed emails so we don't double-count.
PROCESSED_LABEL = os.environ.get("ETSY_PROCESSED_LABEL", "SalesSyncProcessed")


def get_gmail_service():
    """Authenticate and return a Gmail API service."""
    creds = None
    oauth_creds_path = os.environ.get("GMAIL_OAUTH_CREDENTIALS", "gmail_credentials.json")

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, GMAIL_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                oauth_creds_path, GMAIL_SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)


def get_or_create_label(service, label_name):
    """Get or create a Gmail label for tracking processed emails."""
    results = service.users().labels().list(userId="me").execute()
    for label in results.get("labels", []):
        if label["name"] == label_name:
            return label["id"]

    # Create the label
    body = {
        "name": label_name,
        "labelListVisibility": "labelShow",
        "messageListVisibility": "show",
    }
    created = service.users().labels().create(userId="me", body=body).execute()
    logger.info("Created Gmail label: %s", label_name)
    return created["id"]


def mark_as_processed(service, message_id, label_id):
    """Add the processed label to a message."""
    service.users().messages().modify(
        userId="me",
        id=message_id,
        body={"addLabelIds": [label_id]},
    ).execute()


def extract_order_info(message_payload):
    """
    Try to extract order details from the Etsy email.
    Returns a dict with whatever info we can parse.
    """
    headers = {h["name"]: h["value"] for h in message_payload.get("headers", [])}
    subject = headers.get("Subject", "")

    # Etsy subjects often look like:
    #   "You made a sale! Order #1234567890"
    #   "New order from [BuyerName]"
    order_match = re.search(r"#(\d+)", subject)
    order_id = order_match.group(1) if order_match else None

    return {
        "subject": subject,
        "order_id": order_id,
        "date": headers.get("Date", ""),
    }


def check_for_new_etsy_orders():
    """
    Check Gmail for unprocessed Etsy order-confirmation emails.
    For each one found, increment the Etsy sales count and mark it processed.

    Returns a list of processed orders.
    """
    service = get_gmail_service()
    label_id = get_or_create_label(service, PROCESSED_LABEL)

    # Search for Etsy order emails that haven't been processed yet
    query = f"from:{ETSY_SENDER} subject:(sale OR order) -label:{PROCESSED_LABEL}"

    results = service.users().messages().list(
        userId="me", q=query, maxResults=50
    ).execute()

    messages = results.get("messages", [])
    if not messages:
        logger.info("No new Etsy order emails found")
        return []

    processed = []
    for msg_ref in messages:
        msg = (
            service.users()
            .messages()
            .get(userId="me", id=msg_ref["id"], format="metadata")
            .execute()
        )

        order_info = extract_order_info(msg.get("payload", {}))
        logger.info("Found Etsy order email: %s", order_info)

        try:
            result = increment_sales("etsy", quantity=1)
            mark_as_processed(service, msg_ref["id"], label_id)
            processed.append({**order_info, "sheet_update": result})
            logger.info("Processed Etsy order: %s", order_info.get("order_id"))
        except Exception:
            logger.exception("Failed to process Etsy order email %s", msg_ref["id"])

    return processed


def run_poll_loop(interval_seconds=60):
    """
    Continuously poll Gmail for new Etsy orders.

    Args:
        interval_seconds: how often to check (default 60s)
    """
    logger.info(
        "Starting Etsy email poll loop (every %ds)...", interval_seconds
    )
    while True:
        try:
            results = check_for_new_etsy_orders()
            if results:
                logger.info("Processed %d new Etsy order(s)", len(results))
        except Exception:
            logger.exception("Error in Etsy email poll loop")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    interval = int(os.environ.get("ETSY_POLL_INTERVAL", "60"))
    run_poll_loop(interval)
