const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, '..', 'agasobanuyekiwacu-firebase-adminsdk-vodnz-8ec9e211a5.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = { db };