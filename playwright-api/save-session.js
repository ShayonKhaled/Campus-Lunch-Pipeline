const { chromium } = require('playwright');

// Must match server.js: the API builds a new context from this file on every
// request, so the session has to land where the API looks rather than wherever
// the script happened to be run from. Running `node save-session.js` from the
// repo directory wrote session.json to playwright-api/ and left the API using
// the stale copy — which looks exactly like "the session expired again".
const SESSION_FILE = process.env.SESSION_FILE || '/home/shayonised/menu-fetcher/session.json';

// Signing in at login.microsoftonline.com is not enough on its own. SharePoint
// issues its own session cookies (FedAuth / rtFa / SPOIDCRL) only once the
// browser has actually visited the site, so saving straight after the login page
// produces a state the API cannot use. Visit SharePoint, then save.
const SHAREPOINT_URL = process.env.SHAREPOINT_URL || 'https://kyotogakuen1-my.sharepoint.com';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://login.microsoftonline.com');

  console.log('Sign in in the browser window.');
  console.log('Answer "Yes" to "Stay signed in?" — a non-persistent session is not reusable.');
  console.log('Press Enter here once you are signed in.');

  await new Promise((resolve) => process.stdin.once('data', resolve));

  console.log(`\nOpening ${SHAREPOINT_URL} so SharePoint issues its own cookies...`);
  await page.goto(SHAREPOINT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  if (page.url().includes('login.microsoftonline.com')) {
    console.error('\nSharePoint redirected back to the sign-in page, so no usable session was captured.');
    console.error('Sign in again and let the SharePoint page load before pressing Enter.');
    await browser.close();
    process.exit(1);
  }

  const cookies = await context.cookies(SHAREPOINT_URL);
  const hasAuthCookie = cookies.some((c) => /^(FedAuth|rtFa|SPOIDCRL)/i.test(c.name));

  await context.storageState({ path: SESSION_FILE });
  await browser.close();

  console.log(`\nSession saved to ${SESSION_FILE}`);
  console.log(`  ${cookies.length} cookie(s) for ${SHAREPOINT_URL}`);
  if (!hasAuthCookie) {
    console.error('  No FedAuth/rtFa cookie was captured — the API will probably still see "Session expired".');
    process.exit(1);
  }
  console.log('  SharePoint auth cookies present.');
})().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(2);
});
