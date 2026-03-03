# AI Sales Sync Agent

Automatically updates a Google Sheet with sales counts from **Shopify** and **Etsy**.

## How It Works

```
┌──────────────┐   webhook (POST)   ┌──────────────────┐   Google Sheets API   ┌──────────────┐
│   Shopify    │ ─────────────────▶ │                  │ ────────────────────▶ │              │
│   (direct)   │                    │  Sales Sync      │                       │  Google      │
└──────────────┘                    │  Agent           │                       │  Sheet       │
                                    │  (Flask + Poller)│                       │              │
┌──────────────┐   Gmail API poll   │                  │ ────────────────────▶ │  Channel | # │
│   Etsy       │ ─────────────────▶ │                  │                       │  Shopify | 4 │
│   (email)    │                    └──────────────────┘                       │  Etsy    | 5 │
└──────────────┘                                                              └──────────────┘
```

| Channel  | Trigger                        | Mechanism                          |
|----------|--------------------------------|------------------------------------|
| Shopify  | New order placed               | Shopify sends a webhook (instant)  |
| Etsy     | Order confirmation email       | Gmail API poll (every 60s)         |

## Setup

### 1. Google Sheets (Service Account)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use existing), enable the **Google Sheets API**
3. Create a **Service Account**, download the JSON key → save as `credentials.json`
4. Share your Google Sheet with the service account email (Editor access)

### 2. Gmail API (OAuth2 — for Etsy email monitoring)

1. In the same Cloud project, enable the **Gmail API**
2. Create **OAuth 2.0 Client ID** (Desktop app type)
3. Download the client secrets JSON → save as `gmail_credentials.json`
4. On first run, a browser window opens for consent. The token is saved as `gmail_token.json`

### 3. Shopify Webhook

1. In Shopify Admin → **Settings → Notifications → Webhooks**
2. Add a webhook for event **Order creation** pointing to:
   ```
   https://your-server.com/webhooks/shopify/order-created
   ```
3. Copy the webhook secret → set as `SHOPIFY_WEBHOOK_SECRET`

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 5. Run

```bash
pip install -r requirements.txt
python app.py
```

The agent will:
- Listen on port 5000 for Shopify webhooks
- Poll Gmail every 60 seconds for new Etsy order emails
- Increment the matching cell in your Google Sheet for each new sale

## Environment Variables

See `.env.example` for all available configuration options.

## Deployment

For production, deploy behind a reverse proxy (nginx) with HTTPS, or use a platform like Railway, Render, or a VPS. The server needs to be publicly accessible for Shopify webhooks to reach it.

You can also run the Etsy email poller standalone:

```bash
python etsy_email_monitor.py
```
