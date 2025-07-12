const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://mihetofilms.web.app/');
  const title = await page.title();

  const output = { title, scrapedAt: new Date().toISOString() };
  fs.writeFileSync('output.json', JSON.stringify(output, null, 2));

  console.log(`✅ Scraped title: ${title}`);

  await browser.close();
})();
