const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => {
      logs.push(msg.text());
  });

  await page.goto('http://localhost:3000/editor/dadcc9ab-5a62-41bc-8458-aec8ba60e420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log("BROWSER LOGS:");
  logs.forEach(l => console.log(l));
  
  const url = page.url();
  console.log("FINAL URL:", url);
  
  await browser.close();
})();
