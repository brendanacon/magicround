"""
Configuration for the email-drive-validator agent.

Before running, you need:
1. A Google Cloud project with Gmail API and Drive API enabled
2. OAuth2 credentials (Desktop app) downloaded as credentials.json
3. Place credentials.json in this directory

On first run, a browser window will open to authorize access.
The token is saved to token.json for subsequent runs.
"""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Google API scopes needed
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Path to OAuth2 credentials file (download from Google Cloud Console)
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")

# Path to store the auth token after first login
TOKEN_FILE = os.path.join(BASE_DIR, "token.json")

# Gmail search query to find the relevant emails
# Adjust this to match the sender or subject of your game emails
GMAIL_SEARCH_QUERY = 'subject:"murder mystery" OR subject:"character" OR subject:"game"'

# How many recent emails to check (most recent first)
MAX_EMAILS_TO_CHECK = 10

# Expected subfolder names inside the Google Drive folder
EXPECTED_SUBFOLDERS = ["character profiles", "character objectives"]

# Maximum file size (bytes) below which a file is suspicious (likely corrupted/empty)
MIN_FILE_SIZE_BYTES = 1024  # 1 KB

# Image file extensions to validate
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".tif"}

# Document extensions to check size for
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls"}
