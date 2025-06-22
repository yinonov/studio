
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, 'us-central1');

// Connect to emulators in development mode
if (process.env.NODE_ENV === 'development') {
  console.log("Development mode: Connecting to Firebase Emulators.");
  // Check if emulators are already connected to prevent errors on hot reloads
  try {
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Auth Emulator connected.");
    }
    // A bit of a hacky way to check for the firestore emulator connection
    if (!(db as any)._settings.host.includes('127.0.0.1')) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      console.log("Firestore Emulator connected.");
    }
    // A bit of a hacky way to check for the functions emulator connection
    if (!(functions as any)._emulator) {
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      console.log("Functions Emulator connected.");
    }
  } catch (error) {
      console.error("Error connecting to Firebase emulators:", error);
  }
}

export { app, auth, db, functions };
