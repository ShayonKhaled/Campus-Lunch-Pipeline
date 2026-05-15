## SharePoint session renewal

This document explains how to create or renew the Playwright `storageState` (the saved browser session) that the Playwright API uses to fetch authenticated PDFs from Microsoft SharePoint.

Why: SharePoint requires an authenticated browser session. The API reuses the saved session (`storageState`) so the headless browser can download files without interactive sign-in on every request. Sessions expire periodically and must be re-created manually.

### Prerequisites
- The machine where you run the renewal must be the same host or have equivalent access to the Playwright service (cookies and storage are host-specific).
- Node.js 18+ and Playwright installed (`npm install` in `playwright-api`).
- A desktop environment or an X server available if you want to run the browser interactively. If the host is headless, use `xvfb-run` or a VNC session.

### Quick interactive renewal
1. SSH to the host (or open a terminal on the VM/container running Playwright).
2. Switch to the directory and install deps if needed:

```bash
cd playwright-api
npm ci
```

3. Run the helper script (interactive):

```bash
# Interactive: opens a browser window where you sign in to Microsoft/your university account
node save-session.js
```

4. Follow the browser prompts to sign in and complete any MFA. When finished, the helper writes the `storageState` JSON (the `SESSION_FILE`) to the path configured in `server.js` (check the `SESSION_FILE` variable).

### Headless or automated hosts
- If the host has no display, run the helper under Xvfb:

```bash
xvfb-run --auto-servernum node save-session.js
```

- Alternatively, run the helper on a desktop machine and securely copy the generated `session.json` to the Playwright host (use `scp`), then place it at the `SESSION_FILE` path.

### Verify and restart
1. Confirm the session file exists and is readable by the service user:

```bash
ls -l /path/to/session.json
chown menu:menu /path/to/session.json   # adjust user/group
chmod 600 /path/to/session.json
```

2. Restart the Playwright service (if running as systemd service):

```bash
sudo systemctl restart menu-fetcher.service
sudo journalctl -u menu-fetcher -f
```

3. Test a fetch using `curl` or the `test-session.js` helper (or run the `fetch-pdf` endpoint via the scraper workflow):

```bash
curl -X POST http://localhost:3456/fetch-pdf -H "Content-Type: application/json" -d '{"url":"<sharepoint-file-url>"}'
```

If you receive a response that includes a redirect to `login.microsoftonline.com` or an HTTP 401, the saved session is not valid — re-run `save-session.js`.

### Troubleshooting
- `login.microsoftonline.com` redirect: session expired or was saved with different cookies/host. Recreate session.
- `debug.png` screenshot: the server writes a screenshot (`debug.png`) on fetch — inspect it to see what the browser saw.
- Playwright errors: ensure Playwright's OS dependencies are installed (fonts, libgtk, libnss, etc.) and that the Node/Playwright versions match the environment used to create the session.
- Permissions: ensure the service user running the Playwright API can read the `SESSION_FILE`.


