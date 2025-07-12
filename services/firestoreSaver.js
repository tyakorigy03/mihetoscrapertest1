const { db } = require('./firestoreService');
const {computeRelevanceScore} = require('../utils/relevanceScore');

/**
 * Save or update movie data in Firestore using batch write.
 * If document exists, it will be merged; otherwise, it will be created.
 *
 * @param {Array<Object>} movies - List of movie objects to save
 * @param {string} collection - Firestore collection name
 */
async function saveMoviesToFirestore(movies, collection = 'moviesv2') {
  const batch = db.batch();
  let count = 0;

  for (const movie of movies) {
    if (!movie.link) continue;

    const id = movie.link.split('/').filter(Boolean).pop(); // extract unique ID from URL
    const docRef = db.collection(collection).doc(id);

    batch.set(docRef, {...movie,score:computeRelevanceScore({
      tmdb_rating: movie.tmdb_rating || 0,
      popularity: movie.popularity || 0,
      publishedAt: movie.publishedAt || '',
      modifiedAt: movie.modifiedAt || '',
      narrator: movie.narrator || '',
      title: movie.title || ''
    })}, { merge: true }); // create or update with merge
    count++;

    // Firestore batch limit is 500
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`✅ Saved ${count} movies so far...`);
    }
  }

  // Final commit for leftover batch items
  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`🎉 Finished saving ${count} movies to Firestore.`);
}

module.exports = { saveMoviesToFirestore };
