const axios = require("axios");
const fs = require("fs");

const API_URL = "https://agasobanuyenow.com/ajax/get-homepage-mixed.php";
const MAX_PAGES = 100; // safety limit
const LIMIT = 20; // items per page

// Delay helper to avoid hammering the server too fast
const delay = ms => new Promise(res => setTimeout(res, ms));

async function scrapeAgasobanuyenow() {
  let page = 1;
  let allItems = [];
  let seenSlugs = new Set();

  while (page <= MAX_PAGES) {
    console.log(`Fetching page ${page}...`);

    try {
      const res = await axios.post(
        API_URL,
        { page, limit: LIMIT },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Referer": "https://agasobanuyenow.com/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
          },
        }
      );

      const { items } = res.data || {};

      if (!items || items.length === 0) {
        console.log("No more items. Stopping...");
        break;
      }

      // Filter duplicates based on 'slug'
      const newItems = items.filter(item => {
        if (seenSlugs.has(item.slug)) return false;
        seenSlugs.add(item.slug);
        return true;
      });

      if (newItems.length === 0) {
        console.log("Only duplicates found. Stopping...");
        break;
      }

      allItems.push(...newItems);
      console.log(`Got ${newItems.length} new items (Total: ${allItems.length})`);

      page++;
      await delay(1000); // wait 1 second between requests (optional)
    } catch (err) {
      console.error(`Error fetching page ${page}:`, err.message);
      break;
    }
  }

  fs.writeFileSync("agasobanuyenow.json", JSON.stringify(allItems, null, 2));
  console.log(`Scraping done! Saved ${allItems.length} items to agasobanuyenow.json`);
}

scrapeAgasobanuyenow();
