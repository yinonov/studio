
// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

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
const functions: Functions = getFunctions(app, 'us-central1'); // Changed to us-central1

// Comment out emulator connections for production or if not using emulators
// if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
//   if (!auth.emulatorConfig) {
//     connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   }
//   const firestoreEmulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost';
//   const firestoreEmulatorPort = parseInt(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080', 10);
//   connectFirestoreEmulator(db, firestoreEmulatorHost, firestoreEmulatorPort);

//   const functionsEmulatorHost = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST || 'localhost';
//   const functionsEmulatorPort = parseInt(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001', 10);
//   connectFunctionsEmulator(functions, functionsEmulatorHost, functionsEmulatorPort);
// }

export { app, auth, db, functions };
