// ============================================================================
// Firebase configuration
// ----------------------------------------------------------------------------
// Replace the values below with the config object from your own Firebase
// project (Project settings -> General -> Your apps -> SDK setup and
// configuration). This project uses the Firebase v10 modular SDK loaded
// straight from the gstatic CDN, so no build step / npm install is required.
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// ----------------------------------------------------------------------------
// Admin identification
// ----------------------------------------------------------------------------
// Simplest approach: list admin emails here. Anyone signed in with one of
// these emails gets access to admin.html.
//
// More robust (recommended for production): set a Firebase custom claim
// `admin: true` on the user via the Admin SDK / a Cloud Function, then swap
// the isAdmin() check in js/admin.js to read the ID token claim instead.
// The Firestore/Storage rules below already support BOTH strategies.
// ----------------------------------------------------------------------------
export const ADMIN_EMAILS = [
  "krasimiruzun@smartmenukj.com",
];

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
