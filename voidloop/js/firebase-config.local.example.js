// Copy this file to firebase-config.local.js and fill in the Firebase web app
// values for the environment where Voidloop multiplayer should be enabled.
//
// firebase-config.local.js is ignored by git so real keys are not committed.
globalThis.VOIDLOOP_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
};
