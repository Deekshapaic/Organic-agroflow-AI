const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  page.on('response', response => {
    if (!response.ok()) {
      console.log('RESPONSE NOT OK:', response.url(), response.status());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  const content = await page.evaluate(() => document.getElementById('root')?.innerHTML);
  console.log('ROOT CONTENT LENGTH:', content ? content.length : 'null');
  
  await browser.close();
})();
