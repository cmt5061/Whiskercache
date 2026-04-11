/**
 * WhiskerCache · firebase.js
 * Firebase Firestore sync layer (no authentication)
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  INSERT YOUR FIREBASE CONFIG BELOW                      │
 * │                                                         │
 * │  1. Go to https://console.firebase.google.com           │
 * │  2. Create a project (or open existing)                 │
 * │  3. Add a Web App (</> icon)                            │
 * │  4. Copy the firebaseConfig object here                 │
 * │  5. In Firestore rules, allow read/write (no auth):     │
 * │                                                         │
 * │     rules_version = '2';                                │
 * │     service cloud.firestore {                           │
 * │       match /databases/{database}/documents {           │
 * │         match /{document=**} {                          │
 * │           allow read, write: if true;                   │
 * │         }                                               │
 * │       }                                                 │
 * │     }                                                   │
 * └─────────────────────────────────────────────────────────┘
 */

// ──────────────────────────────────────────────
//  🔧 PASTE YOUR FIREBASE CONFIG HERE
// ──────────────────────────────────────────────
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi17UOAhajqi6eD3hwUSwGZ6xeGJtwOhk",
  authDomain: "whiskercache.firebaseapp.com",
  projectId: "whiskercache",
  storageBucket: "whiskercache.firebasestorage.app",
  messagingSenderId: "1047237369855",
  appId: "1:1047237369855:web:2a05c91e0d8f73e3dc11ca"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// ──────────────────────────────────────────────

// Firestore collection name
const COLLECTION = "whiskers";

// Internal state
let db = null;
let firestoreEnabled = false;
let unsubscribeListener = null;

/**
 * Initialise Firebase. Called once on app startup.
 * Gracefully falls back to offline-only if config is missing/invalid.
 */
function initFirebase() {
  // Bail out if config has not been filled in
  if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.info("[WhiskerCache] Firebase config not set — running in local-only mode.");
    setSyncStatus("offline");
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();

    // Enable offline persistence (IndexedDB cache)
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("[WhiskerCache] Persistence unavailable (multiple tabs).");
        } else if (err.code === "unimplemented") {
          console.warn("[WhiskerCache] Persistence not supported in this browser.");
        }
      });

    firestoreEnabled = true;
    console.info("[WhiskerCache] Firebase initialised ✓");
  } catch (err) {
    console.error("[WhiskerCache] Firebase init failed:", err);
    setSyncStatus("error");
  }
}

/**
 * Write a whisker document to Firestore.
 * Returns a Promise (resolved immediately if offline).
 */
async function firestoreSave(entry) {
  if (!firestoreEnabled || !db) return;
  try {
    setSyncStatus("syncing");
    await db.collection(COLLECTION).doc(entry.id).set({
      id:        entry.id,
      timestamp: entry.timestamp,
      cat:       entry.cat,
      count:     entry.count,
      note:      entry.note || null,
    });
    setSyncStatus("synced");
  } catch (err) {
    console.error("[WhiskerCache] Save failed:", err);
    setSyncStatus("error");
  }
}

/**
 * Delete a whisker document from Firestore.
 */
async function firestoreDelete(id) {
  if (!firestoreEnabled || !db) return;
  try {
    setSyncStatus("syncing");
    await db.collection(COLLECTION).doc(id).delete();
    setSyncStatus("synced");
  } catch (err) {
    console.error("[WhiskerCache] Delete failed:", err);
    setSyncStatus("error");
  }
}

/**
 * Start a real-time listener on the whiskers collection.
 * Calls onUpdate(entries[]) whenever Firestore changes.
 * Merges with existing local data and deduplicates by id.
 */
function firestoreListen(onUpdate) {
  if (!firestoreEnabled || !db) return;

  setSyncStatus("syncing");

  unsubscribeListener = db
    .collection(COLLECTION)
    .onSnapshot(
      (snapshot) => {
        const remote = [];
        snapshot.forEach((doc) => remote.push(doc.data()));
        setSyncStatus("synced");
        onUpdate(remote);
      },
      (err) => {
        console.error("[WhiskerCache] Listener error:", err);
        setSyncStatus("error");
      }
    );
}

/**
 * Stop the Firestore real-time listener.
 */
function firestoreUnlisten() {
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
  }
}

/**
 * Update the small sync indicator dot in the header.
 * States: "syncing" | "synced" | "error" | "offline"
 */
function setSyncStatus(state) {
  const el = document.getElementById("syncIndicator");
  if (!el) return;
  el.className = "sync-indicator";
  if (state === "syncing") el.classList.add("syncing");
  if (state === "synced")  el.classList.add("synced");
  if (state === "error")   el.classList.add("error");
  // "offline" leaves it grey (default)
}

// Expose to app.js via globals
window.WhiskerFirebase = {
  init:     initFirebase,
  save:     firestoreSave,
  remove:   firestoreDelete,
  listen:   firestoreListen,
  unlisten: firestoreUnlisten,
};
