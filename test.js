const { enrichWithTMDB } = require("./services/enrichWithTmdb");
const supabase = require("./services/supabaseClient");

async function getMovieNames() {
  const enrichedMovies = [];

  try {
    const { data, error } = await supabase
      .from('moviesv2')
      .select('id, title, release_date, type') // Optimize: only needed fields
      .is('id', '2c5a00d2-6a46-4727-9f5f-fa93ed1b1bf0')
      .limit(5);

    if (error) throw error;

    for (const movie of data) {
      console.log(`🔍 Enriching: ${movie.title} (${movie.release_date})`);
      const enriched = await enrichWithTMDB({
        title: movie.title,
        publishedAt: movie.release_date,
        type: movie.type || 'movie',
      });

      enrichedMovies.push({ original: movie, enriched });
    }

  } catch (err) {
    console.error('❌ Failed to fetch or enrich movie names:', err.message);
  }

  console.log('✅ Enriched Movies:');
  enrichedMovies.forEach((item, index) => {
    console.log(`${index + 1}. ${item.original.title}`);
    console.log(item.enriched);
  });
}

getMovieNames();
