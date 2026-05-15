const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'session.json'  // loads your saved login
  });
  const page = await context.newPage();
  
  // Try opening a SharePoint URL
  await page.goto('https://kyotogakuen1-my.sharepoint.com');
  
  // Wait 5 seconds so you can see if it's logged in
  await page.waitForTimeout(5000);
  
  // Take a screenshot to check
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('Screenshot saved to test-screenshot.png');
  
  await browser.close();
})();
