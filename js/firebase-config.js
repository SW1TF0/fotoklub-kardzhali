// ============================================================================
// Firebase configuration
// ----------------------------------------------------------------------------
// Project: fotoklub-kardzhali (console.firebase.google.com/project/fotoklub-kardzhali)
// This project uses the Firebase v10 modular SDK loaded straight from the
// gstatic CDN, so no build step / npm install is required.
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Note: no Firebase Storage. New Firebase projects require the paid Blaze
// plan to enable Cloud Storage, so photo uploads use plain image URLs
// (pasted into the admin panel) instead — see js/admin.js and
// firebase/storage.rules for details.
const firebaseConfig = {
  apiKey: "AIzaSyBpxnTYjefIq61LVdXOhr-qESk0eoh_Ly8",
  authDomain: "fotoklub-kardzhali.firebaseapp.com",
  projectId: "fotoklub-kardzhali",
  messagingSenderId: "828843374669",
  appId: "1:828843374669:web:01f37180d5d48b213d8404",
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
export const googleProvider = new GoogleAuthProvider();
