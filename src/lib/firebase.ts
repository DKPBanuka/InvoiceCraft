
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
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Firestore persistence enabled successfully.");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn(
        "Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time."
      );
    } else if (err.code === 'unimplemented') {
      console.warn(
        "Firestore persistence is not supported in this browser."
      );
    } else {
      console.error("An error occurred while enabling Firestore persistence:", err);
    }
  });

export { db, auth, storage };
