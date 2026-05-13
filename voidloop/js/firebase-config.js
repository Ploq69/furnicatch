/**
 * Firebase Configuration
 *
 * Project: Voidloop Game
 * Runtime config is loaded from window.VOIDLOOP_FIREBASE_CONFIG.
 * Create js/firebase-config.local.js from js/firebase-config.local.example.js
 * for local or deployment-specific multiplayer credentials.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

if (!globalThis.VOIDLOOP_FIREBASE_CONFIG) {
  try {
    await import('./firebase-config.local.js');
  } catch {
    // Local/deployment config is optional; multiplayer callers surface this.
  }
}

const firebaseConfig = globalThis.VOIDLOOP_FIREBASE_CONFIG;

let db = null;

if (firebaseConfig?.apiKey) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} else {
  console.warn('[Firebase] Multiplayer disabled: missing VOIDLOOP_FIREBASE_CONFIG.');
}

export { db };
