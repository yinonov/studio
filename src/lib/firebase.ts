
import 'dotenv/config'; // Explicitly load environment variables first
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
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

// A more robust way to initialize the app, preventing re-initialization on HMR.
function initializeClientApp(): FirebaseApp {
    if (getApps().length) {
        return getApp();
    }
    
    // The check for apiKey is implicitly handled by initializeApp.
    // If it's missing, Firebase will throw a descriptive error.
    const app = initializeApp(firebaseConfig);
    return app;
}

const app: FirebaseApp = initializeClientApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const functions: Functions = getFunctions(app, 'us-central1');

// Connect to emulators in development mode.
// We use a global variable to prevent reconnecting on hot reloads, which is a clean pattern.
declare global {
  var __firebaseEmulatorsConnected: boolean | undefined;
}

if (process.env.NODE_ENV === 'development' && !global.__firebaseEmulatorsConnected) {
  console.log("Development mode: Connecting to Firebase Emulators.");
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    global.__firebaseEmulatorsConnected = true;
    console.log("Firebase Emulators connected.");
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export { app, auth, db, functions };
