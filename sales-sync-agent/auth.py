"""
Shared OAuth2 authentication for Google APIs (Sheets + Gmail).

Uses a single OAuth2 token file so you only log in once.
On first run, a browser window opens for consent.
"""

import os
import logging

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

# All scopes needed by the agent — Sheets + Gmail
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

TOKEN_FILE = os.environ.get("OAUTH_TOKEN_FILE", "token.json")
OAUTH_CREDS_FILE = os.environ.get("GMAIL_OAUTH_CREDENTIALS", "gmail_credentials.json")


def get_credentials():
    """Load or create OAuth2 credentials (browser consent on first run)."""
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(OAUTH_CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
        logger.info("OAuth token saved to %s", TOKEN_FILE)

    return creds
