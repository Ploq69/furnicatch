/**
 * Firebase Configuration
 *
 * Project: Voidloop Game
 * Database: https://voidloop-game-default-rtdb.firebaseio.com
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyAJ5-bL-ujCY0nblnRDGFxAR6dytXZE5KI",
  authDomain: "voidloop-game.firebaseapp.com",
  databaseURL: "https://voidloop-game-default-rtdb.firebaseio.com",
  projectId: "voidloop-game",
  storageBucket: "voidloop-game.firebasestorage.app",
  messagingSenderId: "348825516592",
  appId: "1:348825516592:web:9325362bf2fa43305d0bf5"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
