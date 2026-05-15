const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://login.microsoftonline.com');
  
  console.log('Log in manually in the browser window...');
  console.log('After fully logged in, press Enter here to save the session.');
  
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  // Save session to disk
  await context.storageState({ path: 'session.json' });
  console.log('Session saved to session.json');
  await browser.close();
})();
