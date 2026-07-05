const { chromium } = require('playwright');
const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE = '/home/shayonised/menu-fetcher/session.json';
const DOWNLOAD_DIR = '/home/shayonised/menu-fetcher/downloads';

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

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
    const base64Pdf = await page.evaluate(async (shareUrl) => {
      // Build download URL
      const downloadUrl = shareUrl + (shareUrl.includes('?') ? '&' : '?') + 'download=1';
      const response = await fetch(downloadUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Fetch failed: ' + response.status);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }, url);

    await browser.close();
    res.json({ success: true, base64Pdf });

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.post('/fetch-pdf-images', async (req, res) => {
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

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

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

    await page.waitForTimeout(5000);

    // Download PDF via browser
    const pdfData = await page.evaluate(async (shareUrl) => {
      const downloadUrl = shareUrl + (shareUrl.includes('?') ? '&' : '?') + 'download=1';
      const response = await fetch(downloadUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Fetch failed: ' + response.status);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }, url);

    await browser.close();

    // Save PDF to temp file
    const pdfPath = '/tmp/menu_fetcher_temp.pdf';
    fs.writeFileSync(pdfPath, Buffer.from(pdfData, 'base64'));

    // Convert to JPEG images using pdftoppm
    const outputDir = '/tmp/menu_fetcher_pages';
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir);

    const { execSync } = require('child_process');
    execSync(`pdftoppm -jpeg -r 200 "${pdfPath}" "${outputDir}/page"`, { timeout: 30000 });

    // Read all generated images
    const images = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('page') && f.endsWith('.jpg'))
      .sort()
      .map(f => {
        const data = fs.readFileSync(`${outputDir}/${f}`);
        return 'data:image/jpeg;base64,' + data.toString('base64');
      });

    // Cleanup
    fs.unlinkSync(pdfPath);
    fs.rmSync(outputDir, { recursive: true });

    if (images.length === 0) {
      return res.status(500).json({ error: 'No images generated from PDF' });
    }

    res.json({ success: true, images, pageCount: images.length });

  } catch (err) {
    if (browser) await browser.close();
    // Cleanup on error
    try { fs.unlinkSync('/tmp/menu_fetcher_temp.pdf'); } catch(e) {}
    try { fs.rmSync('/tmp/menu_fetcher_pages', { recursive: true }); } catch(e) {}
    res.status(500).json({ error: err.message });
  }
});

app.listen(3456, '0.0.0.0', () => {
  console.log('Menu fetcher API running on port 3456');
});
