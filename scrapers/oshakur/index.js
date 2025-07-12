require('dotenv').config();
const puppeteer = require('puppeteer');
const scrapeMovieList = require('./scrapeMovieList');
const scrapeMovieDetails = require('./scrapeMovieDetails');
const { saveMoviesToSupabase } = require('../../services/saveMoviesToSupabase');
const { logInfo, logError } = require('../../utils/logger');

async function runOshakurfilmsScraper(mode = 'all',type='notpatch') {
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    const pageLimit = mode === 'welcome' ? 2 : 79;

    logInfo(`🚀 [${new Date().toLocaleString()}] Starting Oshakurfilms scraper (mode: ${mode})...`);
    
    // Step 1: Get movie sub-links
    const movieLinks = await scrapeMovieList(browser);
    logInfo(`📃 Found ${movieLinks.length} movie links.`);
    // Step 2: Scrape details + enrich with TMDB
    const detailedMovies = await scrapeMovieDetails(browser, movieLinks,type);
    logInfo(`🎯 Collected ${detailedMovies.length} detailed movie records.`);
     console.log(detailedMovies.map(el=>el.title))
    // Step 3: Save to Firestore
    await saveMoviesToSupabase(detailedMovies);
    logInfo('✅ All movies saved to Firestore.');
  } catch (err) {
    logError(`❌ Scraper failed: ${err.message}`);
  } finally {
    await browser.close();
    logInfo('🛑 Browser closed.');
  }
}

// Run if this file is executed directly via `node scrapers/Oshakurfilms/index.js`
if (require.main === module) {
  const modeArg = process.argv[2] || 'all';
  runOshakurfilmsScraper(modeArg);
}

module.exports = runOshakurfilmsScraper;
