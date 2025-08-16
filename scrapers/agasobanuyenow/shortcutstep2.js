const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const { title } = require("process");
const STORAGE_DIR = path.join(__dirname, '../..', 'storage');

async function scrapeMovieLinksPuppeteer(movieUrls) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const output = [];
  for (const movieUrl of movieUrls) {
    const link = movieUrl.type === "movie"
      ? `https://agasobanuyenow.com/movies/${movieUrl.slug}/watch`
      : `https://agasobanuyenow.com/watch/tv/${movieUrl.slug}/1/1`;
    try {
      await page.goto(link, { waitUntil: "networkidle2" });
      const videoslooploops=movieUrl.type === "series" ? await page.evaluate(() => {
        const episodesLink = document.querySelectorAll("#episodesRow > a");
        const episodes = [];
        episodesLink?.forEach((el) => {
          const episodeLink = el?.href;
          const episodeTitle = el?.querySelector(".episode-info .episode-number")?.textContent.trim();
          episodes.push({ link: episodeLink, title: episodeTitle });
        });
        return episodes;
      }) : []; 
      const videos =[];
       // for series version
       console.log('videos loops',videoslooploops)
      if (videoslooploops.length > 1) {
        for (const episode of videoslooploops) {
          await page.goto(episode.link, { waitUntil: "networkidle2" });
          const result = await page.evaluate(() => {
            const videoEl = document.querySelector("#art-player-container > div > video");
            const videoEl1 = document.querySelector("body > main > div.relative.bg-black > div > iframe");
            const videoEl2 = document.querySelector(".player-container iframe");
            const videoOptions =  videoEl?.src ||  videoEl1?.src || videoEl2?.src || "";

            const titleEl = document.querySelector("#video-title-overlay .flex.items-center span");
            const title = titleEl ? titleEl.textContent.trim() : "";
          
            const downloadEl = document.querySelector("body > main > div.flex-1.bg-gradient-to-b.from-black\\/70.to-background\\/90 > div > div.bg-black\\/80.rounded-lg.p-6.mb-8 > div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.gap-4 > div > a");
            const downloadEl1 =document.querySelector('.download-button');
            const downloadOptions =downloadEl?.href || downloadEl1?.href || "";
            const downloadlink=downloadOptions.includes("media.agasobanuyenow.com") ? downloadOptions : null;
       
            return { watchUrl: videoOptions, title,downloadUrl: downloadlink }
          });
          videos.push({...result,title: episode.title,direct: true});
        }
        output.push({ type: movieUrl.type==='movie'?'movie':'tv',release_year:movieUrl.year,title:movieUrl.title,narrator:movieUrl.interpreter, Downloadurls: videos });
        continue;
      }

      //for  movies versions
      const result = await page.evaluate(() => {
        const videoEl = document.querySelector("#art-player-container > div > video");
        const videoEl1 = document.querySelector("body > main > div.relative.bg-black > div > iframe");
        const videoEl2 = document.querySelector(".player-container iframe");

        const videoOptions =  videoEl?.src ||  videoEl1?.src || videoEl2?.src || "";

        const titleEl = document.querySelector("#video-title-overlay .flex.items-center span");

        const title = titleEl ? titleEl.textContent.trim() : "";

        const downloadEl = document.querySelector("body > main > div.flex-1.bg-gradient-to-b.from-black\\/70.to-background\\/90 > div > div.bg-black\\/80.rounded-lg.p-6.mb-8 > div.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3.gap-4 > div > a");
        const downloadEl1 =document.querySelector('.download-button');

        const downloadOptions =downloadEl?.href || downloadEl1?.href || "";
        return { watchUrl: videoOptions,title, downloadUrl:downloadOptions }
      });
      videos.push(result);
      output.push({ type: movieUrl.type==='movie'?'movie':'tv',release_year:movieUrl.year,title:movieUrl.title,narrator:movieUrl.interpreter, Downloadurls: videos });
    } catch (error) {
      console.error(`❌ Error scraping ${link} `);
    }
  }
  await browser.close();
  return output;
}

// Example usage
(async () => {
  const file = path.join(STORAGE_DIR, `agasobanuyenow.json`);
  const outfile = path.join(STORAGE_DIR, `agasobanuyenow1.json`);
  
  const urls = await fs.readJson(file);
  const links = await scrapeMovieLinksPuppeteer(urls.slice(0, 10));
  fs.writeFileSync(outfile, JSON.stringify(links, null, 2));
   console.log(`Scraping done! Saved ${links.length} items to agasobanuyenow.json`);
})();
