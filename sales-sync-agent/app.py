"""
AI Sales Sync Agent — main application.

Runs two things concurrently:
1. A Flask web server that receives Shopify order webhooks (real-time).
2. A background polling loop that checks Gmail for Etsy order-confirmation
   emails and updates the Google Sheet accordingly.

The Google Sheet acts as the single source of truth for sales counts.
"""

import os
import sys
import logging
import threading

from flask import Flask, jsonify

from shopify_webhook import shopify_bp
from etsy_email_monitor import run_poll_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.register_blueprint(shopify_bp)


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return jsonify({"status": "healthy", "service": "sales-sync-agent"}), 200


@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "AI Sales Sync Agent",
        "endpoints": {
            "POST /webhooks/shopify/order-created": "Shopify order webhook",
            "GET /health": "Health check",
        },
        "background": "Etsy email polling active",
    })


def start_etsy_poller():
    """Start the Etsy email polling loop in a background thread."""
    interval = int(os.environ.get("ETSY_POLL_INTERVAL", "60"))
    thread = threading.Thread(
        target=run_poll_loop, args=(interval,), daemon=True
    )
    thread.start()
    logger.info("Etsy email poller started (interval: %ds)", interval)
    return thread


def main():
    port = int(os.environ.get("PORT", "5000"))
    host = os.environ.get("HOST", "0.0.0.0")

    # Start the Etsy email poller in the background
    start_etsy_poller()

    # Start the Flask server for Shopify webhooks
    logger.info("Starting Sales Sync Agent on %s:%d", host, port)
    app.run(host=host, port=port, debug=False)


if __name__ == "__main__":
    main()
