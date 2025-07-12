const { getPredefinedLinks } = require('../../utils/linkLoader');
const { loadScraperState, saveScraperState } = require('../../utils/stateManager');
const { logInfo, logError } = require('../../utils/logger');

const SITE_KEY = 'agasobanuyelive';

module.exports = async function scrapeMovieList(browser, pageLimit, type) {
  const predefinedLinks = await getPredefinedLinks(SITE_KEY);
  const state = await loadScraperState(SITE_KEY);

  const processedLinksArray = state.processedLinks || [];
  const failedPages = state.failedPages || [];

  // Map for fast lookup
  const alreadyProcessed = new Map(processedLinksArray.map(item => [item.page, item.subLinks]));
  const alreadyFailed = new Set(failedPages.map(item => item.page));

  const page = await browser.newPage();
  const results = [];

  // Add all previous subLinks if NOT patch mode
  if (type !== 'patch') {
    for (const subLinks of alreadyProcessed.values()) {
      results.push(...subLinks);
    }
  }
  let counter = 0;
  for (const link of predefinedLinks) {
    counter++;
    if (counter > pageLimit) break;

    const isAlreadyDone = alreadyProcessed.has(link);
    const shouldSkip = type !== 'patch' && isAlreadyDone;

    if (shouldSkip && counter>2) {
      logInfo(`⏭️ Skipping already scraped: ${link}`);
      continue;
    }
    try {
      await page.goto(link, { waitUntil: 'domcontentloaded' });
      const movieSubLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h1.elementor-heading-title.elementor-size-default > a'))
          .map(el => el?.href || '')
          .filter(Boolean);
      });
      results.push(...movieSubLinks);
      // Only save if not patch and not limited
      if (type !== 'patch' && pageLimit !== 2) {
        alreadyProcessed.set(link, movieSubLinks);

        const processedLinks = Array.from(alreadyProcessed.entries())
          .map(([page, subLinks]) => ({ page, subLinks }));

        await saveScraperState(SITE_KEY, {
          ...state,
          processedLinks,
          failedPages // unchanged
        });
      }
      // Remove from failed list if it previously failed
      if (alreadyFailed.has(link)) {
        const updatedFails = failedPages.filter(item => item.page !== link);
        await saveScraperState(SITE_KEY, {
          ...state,
          processedLinks: Array.from(alreadyProcessed.entries()).map(([page, subLinks]) => ({ page, subLinks })),
          failedPages: updatedFails
        });
      }
      logInfo(`✅ Scraped: ${link}`);
    } catch (err) {
      logError(`❌ Failed to scrape ${link}: ${err.message}`);

      // Save failure
      if (!alreadyFailed.has(link)) {
        failedPages.push({ page: link, error: err.message, saved: false });
        await saveScraperState(SITE_KEY, {
          ...state,
          processedLinks: Array.from(alreadyProcessed.entries()).map(([page, subLinks]) => ({ page, subLinks })),
          failedPages
        });
        alreadyFailed.add(link);
      }
    }
  }

  await page.close();
  return results;
};

