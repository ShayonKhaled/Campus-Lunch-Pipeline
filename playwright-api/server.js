const { chromium } = require('playwright');
const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE = process.env.SESSION_FILE || '/home/shayonised/menu-fetcher/session.json';
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/home/shayonised/menu-fetcher/downloads';

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

/**
 * SharePoint hands out two shapes of file link, and they do not download alike.
 *
 *   ":b:/g/personal/…"            a guest (share) link. "?download=1" is honoured
 *                                 anonymously, no session needed.
 *   ":b:/r/personal/…/onedrive.aspx?id=…"
 *                                 a viewer link. "?download=1" returns the OneDrive
 *                                 page instead of the file, and only the saved
 *                                 session can fetch it — via download.aspx with the
 *                                 server-relative path as SourceUrl.
 *
 * The 2026-11-02 email switched to viewer links, so the old code was saving the
 * OneDrive HTML page and reporting success: Gemini then rejected it with a bare
 * "Bad request", and the week was never scraped.
 */
function toDownloadUrl(url) {
  const parsed = new URL(url);
  const serverRelativePath = parsed.searchParams.get('id');
  const personalSite = parsed.pathname.match(/\/personal\/([^/]+)\//);

  if (serverRelativePath && personalSite) {
    return (
      `${parsed.origin}/personal/${personalSite[1]}/_layouts/15/download.aspx` +
      `?SourceUrl=${encodeURIComponent(serverRelativePath)}`
    );
  }

  return url + (url.includes('?') ? '&' : '?') + 'download=1';
}

/** A real PDF starts with "%PDF". SharePoint errors arrive as HTML or JSON. */
function looksLikePdf(base64Pdf) {
  return Buffer.from(base64Pdf.slice(0, 8), 'base64').toString('latin1').startsWith('%PDF');
}

app.post('/fetch-pdf', async (req, res) => {
  const url = req.body && req.body.url;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({
      storageState: SESSION_FILE,
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // The saved state carries the Microsoft sign-in (ESTSAUTHPERSISTENT), not
    // SharePoint's own cookie: FedAuth is issued when the browser visits the
    // site, by the SSO redirect chain. A cold request straight to the download
    // endpoint never runs that chain — it either dies ("Failed to fetch", the
    // request has no session) or bounces to the login page, which the check
    // below reported as "Session expired" even though the session was fine.
    // Visiting the site root first is what makes the fetch below authenticated:
    // measured on 2026-11-03, cold = failure, warmed up = 1.29 MB application/pdf.
    try {
      await page.goto(new URL(url).origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
    } catch (err) {
      console.log(`warm-up navigation failed (continuing): ${err.message.split('\n')[0]}`);
    }

    const cookies = await context.cookies();
    const authenticated = cookies.some((c) => /^(FedAuth|rtFa|SPOIDCRL)/i.test(c.name));

    await page.screenshot({ path: DOWNLOAD_DIR + '/../debug.png' });

    // Use page.evaluate to fetch the PDF as base64 using the browser's authenticated fetch
    const downloadUrl = toDownloadUrl(url);
    let base64Pdf;
    try {
      base64Pdf = await page.evaluate(async (target) => {
        const response = await fetch(target, { credentials: 'include' });
        if (!response.ok) throw new Error('Fetch failed: ' + response.status);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }, downloadUrl);
    } catch (err) {
      // Only now is an expired session the likely story. Guest links (the Halal
      // menus, ":b:/g/…") download anonymously and must keep working even when
      // the saved sign-in has lapsed, so the cookie is a diagnosis here, not a
      // gate.
      await browser.close();
      if (!authenticated) {
        await fetch('https://YOUR_DISCORD_WEBHOOK_URL', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content:
              '🔴 **Menu Bot Alert** — Microsoft session expired!\nRun `node save-session.js` on the Debian VM to fix.',
          }),
        }).catch(() => {});
        return res.status(401).json({ error: `Session expired. Re-run save-session.js. (${err.message.split('\n')[0]})` });
      }
      throw err;
    }

    await browser.close();

    // Never claim success for something that is not a PDF. Returning the
    // OneDrive page as if it were the menu is what made this fail silently.
    if (!looksLikePdf(base64Pdf)) {
      return res.status(502).json({
        error:
          'SharePoint returned a page, not a PDF. The saved session is probably expired ' +
          '(run save-session.js on this VM) or the link is a viewer link that needs it.',
        downloadUrl,
      });
    }

    res.json({ success: true, base64Pdf });

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(3456, '0.0.0.0', () => {
  console.log('Menu fetcher API running on port 3456');
});
