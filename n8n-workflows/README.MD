# n8n Workflows

This folder contains the two n8n workflows that run everything. Import these JSON files into your n8n instance and configure the credentials described below.

Workflows
- `workflow-1-menu-scraper.json` — Runs weekly (Saturday) to locate the SharePoint-hosted PDF, fetch it via the Playwright API, send the PDF to Claude for extraction, and insert parsed menu items into PostgreSQL.
- `workflow-2-discord-poster.json` — Runs Monday–Friday at 9:00 JST to query today's menu from PostgreSQL and post a formatted message to Discord.

Required credentials
- Gmail OAuth2 — used by the scraper workflow to access the weekly menu email.
- Anthropic / Claude API key — used to extract structured JSON from the PDF (model referenced in workflow is `claude-sonnet-4-6`).
- PostgreSQL — a connection to the `campus_lunch` (or your chosen) database and a user with INSERT/SELECT privileges.
- Discord webhook — used by the poster workflow to send messages. Use n8n credentials or environment variables; do not hardcode webhook URLs in the workflow JSON.

Import and quick-start

1. In n8n, go to `Workflows` → `Import from file` and import each JSON file.
2. Add credentials in n8n for Gmail, Anthropic (Claude), PostgreSQL, and Discord.
3. Ensure the Playwright API (see `playwright-api`) is running and reachable by n8n.

See `SETUP.md` for detailed deployment and credential configuration steps.


