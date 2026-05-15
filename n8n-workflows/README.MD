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

Import and configuration
1. In n8n, go to `Workflows` → `Import from file` and import each JSON file.
2. Configure credentials in n8n for Gmail, PostgreSQL, and HTTP requests (for the Discord webhook). Prefer n8n credential store or environment variables rather than editing the JSON directly.
3. For the Playwright API call in workflow-1, ensure the `Playwright API` service (see `playwright-api/server.js`) is running and reachable by n8n.
4. If you use Discord webhooks, create them in your server and add them in n8n HTTP Request nodes as credentials or use an `Express` or `Webhook` credential as appropriate.

Testing
- Use `Execute Workflow` in n8n to run the workflows manually for testing. For `workflow-1-menu-scraper`, test with a known SharePoint PDF link and verify the Playwright API returns a base64 PDF and the Claude node returns a valid JSON array.
- For `workflow-2-discord-poster`, you can toggle the schedule to run manually or run the workflow with test data to confirm message formatting.

Security and notes
- Never commit live API keys, webhooks, or database passwords. If any secrets were committed, revoke them and rotate credentials.
- The workflows include placeholder webhook values (e.g., `YOUR_DISCORD_WEBHOOK_URL`) in the repository — replace these with appropriate values.
- The scraper workflow depends on a saved Microsoft session for SharePoint access. See `playwright-api/save-session.js` and `docs/sharepoint-session-renewal.md` for instructions to (re)authenticate.


Troubleshooting
- If the Playwright-based fetch fails with a login page, re-run `playwright-api/save-session.js` on the host running the Playwright service to renew the Microsoft session.
- Check n8n execution logs for node errors and inspect node inputs/outputs when debugging workflow runs.

