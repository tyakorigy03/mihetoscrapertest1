// utils/updateScores.js
const { logInfo, logError } = require('./logger');
const { db } = require('../services/firestoreService');
const { computeRelevanceScore } = require('./relevanceScore');

async function updateMovieScores() {
  const snapshot = await db.collection('movies').get();
  let count = 0;
  let batch = db.batch();
  let opCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const score = computeRelevanceScore({
      tmdb_rating: data.tmdb_rating || 0,
      popularity: data.popularity || 0,
      publishedAt: data.publishedAt || '',
      modifiedAt: data.modifiedAt || '',
      narrator: data.narrator || '',
      title: data.title || ''
    });

    batch.update(doc.ref, { relevanceScore: score });
    count++;
    opCount++;

    if (opCount === 500) {
      await batch.commit(); // ✅ commit
      logInfo(`✅ Committed ${count} movies...`);
      batch = db.batch();   // ✅ reset the batch
      opCount = 0;
    }
  }

  // Commit remaining if any
  if (opCount > 0) {
    await batch.commit();
    logInfo(`✅ Final batch committed. Total updated: ${count}`);
  }

  return count;
}

module.exports = updateMovieScores;
