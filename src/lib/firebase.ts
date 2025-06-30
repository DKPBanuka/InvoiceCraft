
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDj0UfT40Q2YZzRCbQitVlrLUR_lQiopfQ",
  authDomain: "invoicecraft-9568q.firebaseapp.com",
  projectId: "invoicecraft-9568q",
  storageBucket: "invoicecraft-9568q.appspot.com",
  messagingSenderId: "97694279395",
  appId: "1:97694279395:web:85e5d73fbb8ae2603847d6"
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
