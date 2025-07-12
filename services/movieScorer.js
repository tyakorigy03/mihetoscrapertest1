const { db } = require('./firestoreService');
const path = require('path');
const fs = require('fs').promises;
const { logInfo, logError } = require('../utils/logger');

const COLLECTION_NAME = 'moviesv2';
const RATINGS_FILE = path.join(__dirname, '..', 'data', 'narratorRatings.json');

async function loadNarratorRatings() {
  try {
    const data = await fs.readFile(RATINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    logError('Failed to load narrator ratings:', err.message);
    return {};
  }
}

/**
 * Scores and sorts all movies based on narrator rating
 * @param {boolean} updateFirestore - whether to update Firestore with the score
 * @returns {Array} sorted movies by score descending
 */
async function scoreAndSortMovies(updateFirestore = false) {
  const narratorRatings = await loadNarratorRatings();
  if (!narratorRatings || Object.keys(narratorRatings).length === 0) {
    logError('Narrator ratings data is empty, aborting scoring.');
    return [];
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();

    if (snapshot.empty) {
      logInfo('No movies found in Firestore.');
      return [];
    }

    const scoredMovies = [];

    for (const doc of snapshot.docs) {
      const movie = doc.data();
      const narratorRaw = movie.narrator || '';
      const narratorKey = narratorRaw.trim().toLowerCase();
      const narratorRating = narratorRatings[narratorKey] || 0;

      // Compute movie score (you can extend this later)
      const score = narratorRating;

      const movieWithScore = {
        id: doc.id,
        ...movie,
        narrator_rating: narratorRating,
        score,
      };

      if (updateFirestore) {
        try {
          await doc.ref.update({ narrator_rating: narratorRating, score });
          logInfo(`Updated Firestore movie "${movie.title}" with score ${score}`);
        } catch (e) {
          logError(`Failed to update score for "${movie.title}": ${e.message}`);
        }
      }

      scoredMovies.push(movieWithScore);
    }

    // Sort descending by score
    scoredMovies.sort((a, b) => b.score - a.score);

    return scoredMovies;
  } catch (err) {
    logError('Failed to score movies:', err.message);
    return [];
  }
}

module.exports = { scoreAndSortMovies };
