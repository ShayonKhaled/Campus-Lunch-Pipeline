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

    // First navigate to the SharePoint page to establish session
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Check session
    if (page.url().includes('login.microsoftonline.com')) {
      await browser.close();

    await fetch('https://YOUR_DISCORD_WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      content: '🔴 **Menu Bot Alert** — Microsoft session expired!\nRun `node save-session.js` on the Debian VM to fix.' 
    })
  });
      return res.status(401).json({ error: 'Session expired. Re-run save-session.js.' });
    }

    // Wait for page to fully load
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/home/shayonised/menu-fetcher/debug.png' });

    // Use page.evaluate to fetch the PDF as base64 using the browser's authenticated fetch
    const downloadUrl = toDownloadUrl(url);
    const base64Pdf = await page.evaluate(async (target) => {
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
