/* ============================================================
   FIREBASE CONFIGURATION
   Initialize Firebase app and expose the db reference globally.
   ============================================================ */

firebase.initializeApp({
  apiKey:       "AIzaSyAci82Z-y3lxakniDCA0rvQBR81jyzrY_I",
  authDomain:   "pkm-pi-c7762.firebaseapp.com",
  databaseURL:  "https://pkm-pi-c7762-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:    "pkm-pi-c7762"
});

/* Global database reference – used by firebase-service.js and app.js */
const db = firebase.database();
