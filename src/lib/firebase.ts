import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled
            // in one tab at a time.
            console.warn('Firestore offline persistence failed: Multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the
            // features required to enable persistence
            console.warn('Firestore offline persistence is not supported in this browser.');
        }
    });
} catch (err) {
    console.error("Error enabling Firestore persistence:", err);
}


export { db, auth };
