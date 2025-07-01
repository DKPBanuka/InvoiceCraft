
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Enable offline persistence.
// This must be called before any other Firestore operations.
// It allows the app to work with cached data when offline.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
        // This can happen if you have multiple tabs open, as persistence can only be
        // enabled in one tab at a time. The app will still function offline in the
        // primary tab.
        console.warn('Firestore offline persistence failed: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence.
        console.warn('Firestore offline persistence is not supported in this browser.');
    } else {
        console.error("Error enabling Firestore persistence:", err);
    }
});

export { db, auth, storage };
