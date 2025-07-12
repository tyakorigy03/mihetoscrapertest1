require('dotenv').config();
const runAgasobanuyeliveScraper = require('./scrapers/agasobanuyelive/index');
const { logInfo, logError } = require('./utils/logger');
const {
  loadRunState,
  saveRunState,
  loadScraperState
} = require('./utils/stateManager');
const updateMovieScores=require("./utils/updateScoresWithSupabase")

const SITE_KEY = 'agasobanuyelive';
const WELCOME_INTERVAL_MINUTES = 120;
const ALL_INTERVAL_DAYS = 360;

/**
 * Check if there are any failed movies that need retrying
 */
async function hasFailedItems() {
  try {
    const state = await loadScraperState(SITE_KEY);
    const failed = (state.failed || []).filter(item => !item.saved);
    return failed.length > 0;
  } catch (err) {
    logError(`⚠️ Failed to check failed items: ${err.message}`);
    return false;
  }
}

(async () => {
  const now = Date.now();
  const thirtyMinutes = WELCOME_INTERVAL_MINUTES * 60 * 1000;
  const sevenDays = ALL_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const scoreUpdateInterval=7*24 * 60 * 60 * 1000; 'once seven day'

  let runState = await loadRunState(SITE_KEY);
  const lastWelcome = runState.lastWelcomeRun || 0;
  const lastAll = runState.lastAllRun || 0;
  const lastScoreUpdate=runState.lastScoreUpdate || 0;

  try {
    // Step 1: Retry failed items
    if (await hasFailedItems()) {
      logInfo('🔁 Retrying failed items (not patch mode)...');
      await runAgasobanuyeliveScraper('all', 'notpatch');
      runState['lastPatchRun'] = now;
    }

    // Step 2: Run welcome mode every 30 min
    else if (now - lastWelcome >= thirtyMinutes) {
      logInfo('⏱️ Running welcome mode...');
      await runAgasobanuyeliveScraper('welcome', 'patch');
      runState['lastWelcomeRun'] = now;

    }

    // Step 3: Run full scrape once every 360 days
    else if (now - lastAll >= sevenDays) {
      logInfo('📅 Weekly full scrape (all mode)...');
      // await runAgasobanuyeliveScraper('all', 'patch');
      runState.lastAllRun = now;
    }else if(now-lastScoreUpdate>=scoreUpdateInterval){
     await updateMovieScores()
       runState['lastScoreUpdate']=now
    } else {
      logInfo('⏳ No eligible task to run at this time.');
    }


  } catch (err) {
    logError(`❌ Critical failure in main scheduler: ${err.message}`);
  } finally {
    await saveRunState(SITE_KEY, runState);
  }
})();
