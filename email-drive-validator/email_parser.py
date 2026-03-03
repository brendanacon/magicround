"""
Gmail email parser.

Fetches recent emails matching the search query and extracts:
- The number of guests/characters expected
- Google Drive folder links
"""

import base64
import re
from html.parser import HTMLParser

from config import GMAIL_SEARCH_QUERY, MAX_EMAILS_TO_CHECK


class HTMLTextExtractor(HTMLParser):
    """Simple HTML-to-text converter that preserves link URLs."""

    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for attr_name, attr_value in attrs:
                if attr_name == "href" and attr_value:
                    self.urls.append(attr_value)

    def handle_data(self, data):
        self.text_parts.append(data)

    def get_text(self):
        return " ".join(self.text_parts)

    def get_urls(self):
        return self.urls


def extract_body(payload):
    """Recursively extract the email body text from a Gmail message payload."""
    bodies = []

    if "body" in payload and payload["body"].get("data"):
        raw = payload["body"]["data"]
        decoded = base64.urlsafe_b64decode(raw).decode("utf-8", errors="replace")
        mime_type = payload.get("mimeType", "")
        bodies.append((mime_type, decoded))

    if "parts" in payload:
        for part in payload["parts"]:
            bodies.extend(extract_body(part))

    return bodies


def parse_email_content(bodies):
    """Parse email bodies to extract plain text and all URLs."""
    plain_text = ""
    all_urls = []

    for mime_type, content in bodies:
        if mime_type == "text/plain":
            plain_text += content + "\n"
            # Extract URLs from plain text
            urls = re.findall(r'https?://[^\s<>"\']+', content)
            all_urls.extend(urls)
        elif mime_type == "text/html":
            extractor = HTMLTextExtractor()
            extractor.feed(content)
            if not plain_text:
                plain_text += extractor.get_text() + "\n"
            all_urls.extend(extractor.get_urls())
            # Also extract URLs via regex from raw HTML in case parser missed some
            urls = re.findall(r'https?://[^\s<>"\']+', content)
            all_urls.extend(urls)

    return plain_text.strip(), list(set(all_urls))


def extract_drive_links(urls):
    """Filter URLs to find Google Drive folder links and extract folder IDs."""
    drive_links = []
    for url in urls:
        # Match Google Drive folder URLs in various formats
        patterns = [
            r'drive\.google\.com/drive/folders/([a-zA-Z0-9_-]+)',
            r'drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)',
            r'drive\.google\.com/drive/u/\d+/folders/([a-zA-Z0-9_-]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                folder_id = match.group(1)
                drive_links.append({
                    "url": url,
                    "folder_id": folder_id,
                })
                break

    return drive_links


def extract_guest_count(text):
    """
    Extract the number of guests/characters/players from email text.

    Looks for patterns like:
    - "8 guests", "10 players", "8 characters"
    - "for 8", "of 10"
    - Explicit number mentions near game-related keywords
    """
    text_lower = text.lower()

    # Direct patterns: "X guests/players/characters/suspects/people"
    patterns = [
        r'(\d+)\s*(?:guests?|players?|characters?|suspects?|people|participants?|attendees?)',
        r'(?:for|of|with)\s+(\d+)\s+(?:guests?|players?|characters?|people)',
        r'(\d+)\s*-\s*(?:player|person|character|guest)',
        r'(?:party of|group of|game for)\s+(\d+)',
        # "8-10 players" style ranges - take the first number
        r'(\d+)\s*-\s*\d+\s*(?:guests?|players?|characters?|people)',
    ]

    counts = []
    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        for m in matches:
            num = int(m)
            # Reasonable range for a party game
            if 2 <= num <= 50:
                counts.append(num)

    if counts:
        # Return the most commonly found number, or the first one
        from collections import Counter
        return Counter(counts).most_common(1)[0][0]

    return None


def fetch_recent_emails(gmail_service, query=None, max_results=None):
    """
    Fetch recent emails matching the query.

    Returns a list of parsed email dicts with:
    - subject, from, date
    - body_text (plain text content)
    - drive_links (list of {url, folder_id})
    - guest_count (extracted number or None)
    """
    if query is None:
        query = GMAIL_SEARCH_QUERY
    if max_results is None:
        max_results = MAX_EMAILS_TO_CHECK

    results = gmail_service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    messages = results.get("messages", [])
    if not messages:
        print(f"No emails found matching query: {query}")
        return []

    parsed_emails = []

    for msg_info in messages:
        msg = gmail_service.users().messages().get(
            userId="me", id=msg_info["id"], format="full"
        ).execute()

        headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}

        bodies = extract_body(msg["payload"])
        body_text, urls = parse_email_content(bodies)
        drive_links = extract_drive_links(urls)
        guest_count = extract_guest_count(body_text)

        parsed_emails.append({
            "id": msg_info["id"],
            "subject": headers.get("subject", "(no subject)"),
            "from": headers.get("from", "(unknown)"),
            "date": headers.get("date", ""),
            "body_text": body_text,
            "drive_links": drive_links,
            "guest_count": guest_count,
        })

    return parsed_emails
