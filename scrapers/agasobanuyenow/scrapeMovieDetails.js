const { loadScraperState, saveScraperState } = require('../../utils/stateManager');
const { logInfo, logError } = require('../../utils/logger');
const { enrichWithTMDB } = require('../../services/enrichWithTmdb');

const SITE_KEY = 'agasobanuyelive';

module.exports = async function scrapeMovieDetails(browser, movieLinks = [], type) {
      const state = await loadScraperState(SITE_KEY);
      const progressLink2 = state.progressLink2 || [];
      let failed = state.failed || [];

      // Filter failed items: keep only those whose link is not in progressLink2
      const filteredFailed = failed.filter(
        item => !progressLink2.some(el => el.link === item.link)
      );

      // Log info before and after filtering
      logInfo('All failed items:', failed.length);
      logInfo('Failed items NOT in progressLink2:', filteredFailed.length);

      // Update and save if any duplicates were removed
      if (filteredFailed.length !== failed.length) {
        failed = filteredFailed;
        await saveScraperState(SITE_KEY, { ...state, failed });
        logInfo(`✅ Removed ${failed.length - filteredFailed.length} duplicates from failed list.`);
      } else {
        logInfo('No duplicate failed items found in progressLink2.');
      }

  // Track already scraped and failed links for fast lookup
  const alreadyScrapedLinks = type === 'patch'
    ? new Set()
    : new Set(progressLink2.map(item => item.link));
  const alreadyFailedLinks = new Set(failed.map(item => item.link));


  const page = await browser.newPage();

  // Prepare results: include unsaved progress entries for non-patch
  const results = type === 'patch' ? [] : progressLink2.filter(item => !item.saved);

  for (const movieLink of [...movieLinks,...alreadyFailedLinks]) {
    const movieName = movieLink.split('/').filter(Boolean).pop().replace(/[-_]/g, ' ');

    if (alreadyScrapedLinks.has(movieLink)) {
      logInfo(`⏭️ Already scraped: ${movieName}`);
      const existing = progressLink2.find(item => item.link === movieLink);
      if (existing && !existing.saved) results.push(existing);
      continue;
    }
    try {
      logInfo(`🎥 Scraping: ${movieLink}`);
      await page.goto(movieLink, { waitUntil: 'domcontentloaded' });

      const details = await page.evaluate(() => {
        const jsonLd = document.querySelector('script.aioseo-schema')?.innerText;
        let metadata = { title: '', image: '', publishedAt: '', modifiedAt: '', genres: [] ,type:''};

        if (jsonLd) {
          try {
            const data = JSON.parse(jsonLd);
            const post = data['@graph']?.find(item => item['@type'] === 'BlogPosting');
            if (post) {
              metadata.title = post.headline || '';
              metadata.image = post.image?.url || '';
              metadata.publishedAt = post.datePublished || '';
              metadata.modifiedAt = post.dateModified || '';
              metadata.genres = post.articleSection?.split(',').map(g => g.trim()) || [];
              metadata.type=post.articleSection?.includes('Movie')?'movie':'tv';
            }
          } catch (err) {}
        }
        const getText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.split(':').slice(1).join(':').trim() : '';
        };
        const Downloadurls = [];
        const DownurlsPaths = document.querySelectorAll('[id^="tsvg-section-"] > main > figure > ul > li');
        DownurlsPaths.forEach(item => {
          const downloadUrl = item.getAttribute('data-tsvg-link') || '';
          const watchUrl = item.getAttribute('data-tsvg-href') || '';
          const direct = (item.getAttribute('data-tsvg-target') == "_blank");
          const title = item.querySelector("figure > div > figcaption > h2").innerHTML;

          Downloadurls.push({
            title,
            watchUrl,
            downloadUrl,
            direct
          });
        });

        return {
          ...metadata,
          Downloadurls,
          narrator: getText('li.elementor-repeater-item-7297d73 .elementor-post-info__item'),
          release_date: getText('li.elementor-repeater-item-8dc3f58 .elementor-post-info__item'),
          country: getText('li.elementor-repeater-item-3d179ac .elementor-post-info__item')
        };
      });

      const enriched = await enrichWithTMDB({title:details.title,publishedAt:details.release_date,type:details.type});
      const fullData = {
        link: movieLink,
        ...details,
        ...enriched,
        saved: false
      };

      // Add new scrape result only if not already saved
      if (!alreadyScrapedLinks.has(movieLink)) {
        results.push(fullData);
        progressLink2.push(fullData);
        alreadyScrapedLinks.add(movieLink);
      }

      // Remove from failed if it was there previously
      if (alreadyFailedLinks.has(movieLink)) {
        const idx = failed.findIndex(item => item.link === movieLink);
        if (idx !== -1) failed.splice(idx, 1);
        alreadyFailedLinks.delete(movieLink);
      }

      // Save updated state after each successful scrape
      await saveScraperState(SITE_KEY, { ...state, progressLink2, failed });

    } catch (err) {
      logError(`❌ Failed: ${movieName}: ${err.message}`);

      // Save failure if not already recorded
      if (!alreadyFailedLinks.has(movieLink)) {
        const failEntry = { link: movieLink, error: err.message, saved: false };
        failed.push(failEntry);
        alreadyFailedLinks.add(movieLink);
        await saveScraperState(SITE_KEY, { ...state, progressLink2, failed });
      }
    }
  }
  await page.close();
  return results;
};
