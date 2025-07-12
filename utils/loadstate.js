const { loadScraperState } = require("./stateManager");

async function main() {
  const SITE_KEY ='agasobanuyelive'; // Replace with your actual site key

  const state = await loadScraperState(SITE_KEY);

  const progressLink2 = state.progressLink2 || [];
  const failed = state.failed || [];

  // Track already scraped and failed links for fast lookup
  const alreadyScrapedLinks = new Set(progressLink2.map(item => item.link));
  const alreadyFailedLinks = new Set(failed.map(item => item.link));

  // Prepare results: include unsaved progress entries for non-patch
  const results = progressLink2.filter(item => !item.saved);

  console.log(results.map(el => el.title));
}

main().catch(console.error);
