const supabase = require('../services/supabaseClient');
const { logInfo, logError } = require('./logger');
const { computeRelevanceScore } = require('./relevanceScore');
const { enrichWithTMDB } = require('../services/enrichWithTmdb');

const BATCH_SIZE = 100;

async function updateMovieScores() {
  let from = 0;
  let skipped = 0;
  const allScoredMovies = [];

  while (true) {
    const { data: movies, error } = await supabase
      .from('moviesv2')
      .select('*')
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      logError('❌ Error fetching movies:', error);
      break;
    }

    if (!movies || movies.length === 0) break;

    for (const movie of movies) {
      try {
        const enriched = await enrichWithTMDB({
          title: movie.title,
          publishedAt: movie.release_date,
          type: movie.type
        });

        if (!enriched || !enriched.tmdb_id) {
          logInfo(`⏭️ Skipping [${movie.link}] — No TMDB data found`);
          skipped++;
          continue;
        }

        const relevanceScore = computeRelevanceScore({
          tmdb_rating: enriched.tmdb_rating || 0,
          popularity: enriched.popularity || 0,
          publishedAt: movie.publishedAt || '',
          modifiedAt: movie.modifiedAt || '',
          narrator: movie.narrator || '',
          title: movie.title || ''
        });

        allScoredMovies.push({
          ...movie,
          tmdb_id: enriched.tmdb_id,
          tmdb_rating: enriched.tmdb_rating,
          tmdb_metadata: enriched.tmdb_metadata || null,
          tmdb_images: enriched.tmdb_images || null,
          tmdb_trailer: enriched.tmdb_trailer || null,
          tmdb_genres: enriched.tmdb_genres || null,
          relevanceScore
        });
      } catch (err) {
        logError(`❌ Error processing [${movie.link}]:`, err.message);
        skipped++;
      }
    }

    if (movies.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }

  // Sort by relevance score descending and return top 20
  const top20 = allScoredMovies
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, 20);

  logInfo(`🏆 Top 20 Movies by Relevance Score:`);
  top20.forEach((movie, i) => {
    logInfo(`${i + 1}. ${movie.title} — Score: ${movie.relevanceScore}`);
  });

  logInfo(`🎉 Done. Total processed: ${allScoredMovies.length}, skipped: ${skipped}`);
  return { top20, total: allScoredMovies.length, skipped };
}

updateMovieScores();
