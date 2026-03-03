"""
Shopify webhook handler.

Receives order/create webhooks from Shopify, verifies the HMAC signature,
and triggers a Google Sheet update.
"""

import hashlib
import hmac
import base64
import os
import logging

from flask import Blueprint, request, jsonify
from sheets_updater import increment_sales

logger = logging.getLogger(__name__)

shopify_bp = Blueprint("shopify", __name__)


def verify_shopify_hmac(data, hmac_header):
    """Verify that the webhook came from Shopify using HMAC-SHA256."""
    secret = os.environ.get("SHOPIFY_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("SHOPIFY_WEBHOOK_SECRET not set — skipping verification")
        return True

    computed = base64.b64encode(
        hmac.new(secret.encode("utf-8"), data, hashlib.sha256).digest()
    ).decode("utf-8")

    return hmac.compare_digest(computed, hmac_header)


@shopify_bp.route("/webhooks/shopify/order-created", methods=["POST"])
def handle_order_created():
    """
    Endpoint for Shopify's orders/create webhook.

    Shopify sends a POST with the order JSON whenever a new order is placed.
    We verify the HMAC, then increment the Shopify sales count in the sheet.
    """
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
    raw_body = request.get_data()

    if not verify_shopify_hmac(raw_body, hmac_header):
        logger.warning("Invalid Shopify HMAC signature")
        return jsonify({"error": "Invalid signature"}), 401

    order = request.get_json(silent=True) or {}
    order_id = order.get("id", "unknown")
    order_name = order.get("name", "unknown")

    logger.info("Shopify order received: #%s (ID: %s)", order_name, order_id)

    # Count line items to determine quantity if desired,
    # or just count as 1 sale per order.
    try:
        result = increment_sales("shopify", quantity=1)
        logger.info("Sheet updated: %s", result)
        return jsonify({"status": "ok", "result": result}), 200
    except Exception:
        logger.exception("Failed to update sheet for Shopify order %s", order_id)
        return jsonify({"error": "Sheet update failed"}), 500
