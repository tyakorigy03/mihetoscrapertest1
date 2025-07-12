
const { logInfo, logError } = require('../../utils/logger');

const SITE_KEY = 'oshakurfilms';

module.exports = async function scrapeMovieList(browser) {
  const link='https://oshakurfilms.com/'
  const page = await browser.newPage();
  const results = [];



    try {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      const movieSubLinks = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll(
          '#__next > div:nth-child(2) > main > main:nth-child(6) > div.flex.px-4.md\\:px-10.lg\\:px-20.my-4.gap-4.md\\:gap-6.overflow-x-auto.no-scrollbar > div'
        )
      )
        .map(el => el?.querySelector('a')?.href || '')
        .filter(Boolean);

      });
      results.push(...movieSubLinks);
      logInfo(`✅ Scraped: ${link}`);
    } catch (err) {
      logError(`❌ Failed to scrape ${link}: ${err.message}`);

     
    }

  await page.close();
  return results;
};

