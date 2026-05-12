import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Use a real Firebase project in production by setting VITE_FIREBASE_* env
// variables. In development we point to the Firebase emulators, which run via
// `npm run emulators` (project id: `demo-pft`).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-pft.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-pft",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-pft.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Auto-connect to local emulators in dev or when explicitly requested. Production
// builds skip this and use the real Firebase services configured above.
const useEmulators =
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" ||
  (import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "false");

if (useEmulators && typeof window !== "undefined") {
  // Guard against double-connect during HMR.
  if (!globalThis.__PFT_EMU_CONNECTED__) {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      globalThis.__PFT_EMU_CONNECTED__ = true;
      console.info("[PFT] Connected to Firebase emulators");
    } catch (err) {
      console.warn("[PFT] Failed to connect to Firebase emulators", err);
    }
  }
}

export { db, auth };
