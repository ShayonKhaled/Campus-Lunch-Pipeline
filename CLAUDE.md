# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Lunch Pipeline is a self-hosted n8n automation pipeline that scrapes a university's weekly lunch menu from email (Gmail), extracts structured data from PDFs using the Claude API, stores it in PostgreSQL, and posts daily menu updates to a Discord channel. It is built for a specific Japanese university setup and runs on Proxmox infrastructure with Debian/Ubuntu VMs.

## Architecture

```
[Gmail (weekly email with SharePoint PDF link)]
         |
         v
[n8n Workflow 1: menu-scraper] -- (triggers Saturdays)
  1. Gmail Search node → finds the weekly menu email
  2. HTTP Request node → calls Playwright API POST /fetch-pdf with the SharePoint URL
  3. Claude node → extracts structured JSON from the base64 PDF
  4. PostgreSQL node → inserts parsed menu items into menu_items table
         |
         v
[PostgreSQL: menu_items table]
         |
         v
[n8n Workflow 2: discord-poster] -- (triggers Mon-Fri, 9:00 JST)
  1. PostgreSQL node → queries today's menu by menu_date
  2. Code/Function node → formats the Discord message embed
  3. Discord node → posts to channel via webhook
```

The Playwright API (`playwright-api/server.js`) is a thin Express service that sits between n8n and Microsoft SharePoint. It uses a saved browser storageState (cookies) to authenticate with SharePoint and fetch PDFs as base64. This session expires periodically and must be manually renewed.

## Key Files

- `n8n-workflows/workflow-1-menu-scraper.json` — n8n workflow: scrapes Uzumasa campus menu weekly (Saturday trigger)
- `n8n-workflows/workflow-1-menu-scraper-kameoka.json` — n8n workflow: scrapes Kameoka campus menu weekly (Saturday trigger)
- `n8n-workflows/workflow-2-discord-poster.json` — n8n workflow: posts daily menu to Discord (Mon-Fri trigger)
- `playwright-api/server.js` — Express server exposing `POST /fetch-pdf` and `GET /health`
- `playwright-api/save-session.js` — Interactive script to create/renew the Microsoft SharePoint browser session
- `playwright-api/test-session.js` — Verifies a saved session can access SharePoint
- `database/schema.sql` — PostgreSQL schema (`menu_items` table, indexes, unique constraint)
- `docs/sharepoint-session-renewal.md` — Detailed procedure for renewing the expired Microsoft session

## Commands

```bash
# Playwright API — install
cd playwright-api && npm ci && npx playwright install --with-deps

# Playwright API — run dev server (default port 3456)
cd playwright-api && PORT=3456 node server.js

# Playwright API — create/renew SharePoint session (interactive, needs GUI or xvfb-run)
cd playwright-api && node save-session.js

# Playwright API — test an existing session
cd playwright-api && node test-session.js

# Playwright API — headless session renewal (no display)
cd playwright-api && xvfb-run --auto-servernum node save-session.js

# Database — initialize
createdb campus_lunch
psql -d campus_lunch -f database/schema.sql

# Database — verify schema applied
psql -d campus_lunch -c "\d menu_items"

# Systemd — manage the Playwright API service
sudo systemctl restart menu-fetcher.service
sudo journalctl -u menu-fetcher -f

# Test the Playwright API directly
curl -X POST http://localhost:3456/fetch-pdf \
  -H "Content-Type: application/json" \
  -d '{"url":"<sharepoint-file-url>"}'
```

There is no build step, linter, or test suite for this project. Workflows are imported into n8n via its UI (`Workflows → Import from file`), not deployed programmatically.

## Important Constraints

- **Session expiry**: The Microsoft SharePoint browser session stored in `SESSION_FILE` (default `/home/shayonised/menu-fetcher/session.json`) expires every few weeks. When it does, the scraper sends a Discord alert and the session must be manually renewed via `save-session.js`. See `docs/sharepoint-session-renewal.md` for the full procedure.
- **Both campuses supported**: Uzumasa and Kameoka campuses are each processed by their own scraper workflow. The Kameoka menu uses a different layout (SET A/B, LIVE KITCHEN, CURRY A/B/C, RAMEN, SIDE DISH A/B/C/SALAD) and its scraper prompt reflects this. Both workflows insert into the same `menu_items` table differentiated by the `campus` column.
- **Hardcoded paths**: `server.js` contains hardcoded paths (`SESSION_FILE`, `DOWNLOAD_DIR`, screenshot path) and a Discord webhook placeholder (`YOUR_DISCORD_WEBHOOK_URL`). These must be updated per deployment.
- **No seed data**: The database schema has no seed data — the `menu_items` table starts empty and is populated by the first scraper run.
- **Deduplication**: The unique constraint `unique_dish` is on `(campus, menu_date, dish_name, subcategory)` — insertions that match all four columns will conflict. The n8n workflow should handle this (upsert or skip).
- **menu_date format**: The `menu_date` column is `varchar(10)`, not a proper `date` type. The poster workflow queries with `CURRENT_DATE::text` — both must agree on the string format (likely `YYYY-MM-DD`).
