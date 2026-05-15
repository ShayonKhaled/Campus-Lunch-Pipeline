# Setup

This guide walks through setting up the Campus Lunch Pipeline on a self-hosted environment. The instructions assume Proxmox as the infrastructure host and that services (n8n, Playwright API, PostgreSQL) run inside Debian/Ubuntu VMs or LXC containers provisioned on Proxmox.

Summary (high level)
- PostgreSQL: create database and run `database/schema.sql`.
- Playwright API: install Node.js, Playwright, run `playwright-api` service and create a `storageState` via `save-session.js`.
- n8n: import workflows and configure credentials (Gmail OAuth2, Anthropic API key, PostgreSQL, Discord webhook).

Prerequisites
- A host with Node.js 18+ for Playwright API.
- An n8n instance (v2.8+ recommended).
- PostgreSQL database accessible by n8n and any API components.
- A Discord webhook, Anthropic (Claude) API key, and a Gmail account for the scraper.

1) Database

1.1 Create database (example)

```bash
# on the DB host as postgres user
createdb campus_lunch
```

1.2 Apply schema

```bash
psql -d campus_lunch -f database/schema.sql
```

Notes:
- If `schema.sql` contains `OWNER TO postgres`, run as a superuser or remove/adjust ownership lines.
- For testing you can load example seed data (see `database/seed.sql` if present).

2) Playwright API (menu-fetcher)

2.1 Install

On the machine intended to run Playwright (can be the same host as n8n or separate):

```bash
cd playwright-api
npm ci
npx playwright install --with-deps
```

2.2 Create storage state (one-time/renewal step)

Run the interactive helper to save a browser session that has permissions to fetch SharePoint files:

```bash
node save-session.js
```

Follow the browser login and complete MFA. Confirm `session.json` (the `SESSION_FILE`) was written and protect it.

2.3 Run the service

Development:

```bash
PORT=3456 node server.js
```

Systemd (example): create `/etc/systemd/system/menu-fetcher.service` (see `playwright-api/README.md`), then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now menu-fetcher.service
sudo journalctl -u menu-fetcher -f
```

3) n8n workflows

3.1 Import

In n8n: `Workflows` → `Import from file` → import `n8n-workflows/workflow-1-menu-scraper.json` and `workflow-2-discord-poster.json`.

3.2 Configure credentials

- Gmail OAuth2: create credentials in n8n and test Gmail search node.
- Anthropic / Claude API key: add as credential and verify the Claude node returns JSON.
- PostgreSQL: create credential to connect to `campus_lunch` database.
- Discord webhook: add as credential or store webhook URL in n8n credentials (do not hardcode in the JSON files).

3.3 Test runs

- Run `workflow-1-menu-scraper` manually with a known SharePoint PDF URL and verify the Playwright API returns `base64Pdf` and Claude returns parsed JSON.
- Run `workflow-2-discord-poster` manually (or feed it sample data) and confirm Discord receives the formatted message.

