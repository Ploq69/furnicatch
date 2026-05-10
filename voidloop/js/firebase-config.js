/**
 * Firebase Configuration
 *
 * ONE-TIME SETUP:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project (name it anything, e.g. "voidloop-game")
 * 3. Click the "</>" (Web) icon to add a web app
 * 4. Copy the firebaseConfig object shown
 * 5. Paste it below, replacing the placeholder values
 * 6. Go to Build → Realtime Database → Create Database
 * 7. Choose "Start in test mode" → Enable
 *
 * That's it. The game will work from any browser, anywhere.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

// ── PASTE YOUR FIREBASE CONFIG HERE ──
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID_HERE.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT_ID_HERE-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_PROJECT_ID_HERE.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};
// ──────────────────────────────────────

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error('[Firebase] Failed to initialize. Did you paste your config?', e);
}

export { db };
