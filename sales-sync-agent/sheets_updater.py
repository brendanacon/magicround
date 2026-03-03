"""
Google Sheets updater for sales tracking.

Connects to a Google Sheet and increments the sales count
for a given channel (Shopify or Etsy) when a new sale is detected.
"""

import os
import logging
from googleapiclient.discovery import build

from auth import get_credentials

logger = logging.getLogger(__name__)


def get_sheets_service():
    """Authenticate and return a Google Sheets API service."""
    creds = get_credentials()
    return build("sheets", "v4", credentials=creds)


def get_current_value(service, spreadsheet_id, cell_range):
    """Read the current numeric value from a cell."""
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=cell_range)
        .execute()
    )
    values = result.get("values", [])
    if not values or not values[0]:
        return 0
    try:
        return int(values[0][0])
    except (ValueError, TypeError):
        return 0


def update_cell(service, spreadsheet_id, cell_range, value):
    """Write a value to a specific cell."""
    body = {"values": [[value]]}
    service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=cell_range,
        valueInputOption="RAW",
        body=body,
    ).execute()
    logger.info("Updated %s to %s", cell_range, value)


def increment_sales(channel, quantity=1):
    """
    Increment the sales count for a given channel.

    Args:
        channel: "shopify" or "etsy"
        quantity: number of sales to add (default 1)

    Returns:
        dict with old_value, new_value, and cell info
    """
    spreadsheet_id = os.environ["GOOGLE_SPREADSHEET_ID"]
    sheet_name = os.environ.get("SHEET_NAME", "Sheet1")

    # Map channels to cell locations.
    # Adjust these to match your actual spreadsheet layout.
    # The default assumes:
    #   - Column A = Channel name, Column B = Sales count
    #   - Row 2 = Shopify, Row 3 = Etsy
    channel_cells = {
        "shopify": os.environ.get("SHOPIFY_CELL", f"{sheet_name}!B2"),
        "etsy": os.environ.get("ETSY_CELL", f"{sheet_name}!B3"),
    }

    channel_lower = channel.lower()
    if channel_lower not in channel_cells:
        raise ValueError(f"Unknown channel: {channel}. Expected 'shopify' or 'etsy'.")

    cell_range = channel_cells[channel_lower]
    service = get_sheets_service()

    old_value = get_current_value(service, spreadsheet_id, cell_range)
    new_value = old_value + quantity

    update_cell(service, spreadsheet_id, cell_range, new_value)

    logger.info(
        "Incremented %s sales: %d -> %d", channel, old_value, new_value
    )
    return {
        "channel": channel,
        "cell": cell_range,
        "old_value": old_value,
        "new_value": new_value,
    }
