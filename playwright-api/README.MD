# Playwright API

Small Express service that uses Playwright to fetch SharePoint-hosted PDFs while reusing a saved browser session.

It is intended to run on a local host/VM reachable by the n8n instance. The service exposes a single endpoint used by the scraper workflow to retrieve an authenticated PDF as base64.

## Endpoints
- `POST /fetch-pdf` — body: `{ "url": "<sharepoint-file-url>" }`. Returns `{ success: true, base64Pdf: "..." }` on success or `{ error: "..." }` on failure.
- `GET /health` — returns `{ status: 'ok' }`.

## Requirements
- Node.js 18+
- Playwright (Chromium) dependencies for your OS (see Playwright docs)

## Environment / config
Default paths are set in `server.js`. You can modify these or supply equivalents via environment variables when running under a service manager.
- `SESSION_FILE` — path to Playwright storage state JSON used to reuse Microsoft session (default in `server.js`).
- `DOWNLOAD_DIR` — directory used for temporary downloads and screenshots.
- `PORT` — Express port (default 3456 in `server.js`).

## Quick notes
- This service exposes `POST /fetch-pdf` and `GET /health` (see above).
- The Playwright `storageState` (`SESSION_FILE`) is required for authenticated SharePoint fetches — see `docs/sharepoint-session-renewal.md` for session renewal steps.
- Full setup, systemd unit example, and installation steps are in `SETUP.md` at the repository root; follow that for provisioning and production deployment.


## Troubleshooting
- If `/fetch-pdf` returns a redirect to `login.microsoftonline.com`, the saved session is invalid — re-run `save-session.js`.
- Check `debug.png` (server takes a screenshot on fetch) for a quick view of what the headless browser saw.
- Ensure Playwright's OS dependencies are installed (fonts, libgtk, libnss, etc.) for headless Chromium.

## Example integration (n8n)
In n8n, the scraper workflow calls the Playwright API to get `base64Pdf`. Confirm the Playwright service URL is reachable from your n8n instance and that webhook/credential usage follows your deployment's security model.

## Files
- `server.js` — Express + Playwright server
- `save-session.js` — helper to create storageState via interactive login
- `test-session.js` — quick session validation
- `package.json` — dependencies

