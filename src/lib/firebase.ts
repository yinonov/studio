import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

// Singleton instances for Firebase services
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

// We use a global variable to prevent reconnecting on hot reloads during development.
declare global {
  var __authEmulatorConnected: boolean | undefined;
  var __dbEmulatorConnected: boolean | undefined;
  var __functionsEmulatorConnected: boolean | undefined;
}

function getClientApp() {
    if (app) return app;

    if (getApps().length > 0) {
        app = getApp();
        return app;
    }

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Firebase's own SDK will throw a useful error if the key is still missing.
    // Let's rely on that instead of a custom check.
    app = initializeApp(firebaseConfig);
    return app;
}


export function getClientAuth() {
    if (auth) return auth;

    auth = getAuth(getClientApp());
    if (process.env.NODE_ENV === 'development' && !global.__authEmulatorConnected) {
        console.log("Connecting to Auth emulator");
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        global.__authEmulatorConnected = true;
    }
    return auth;
}

export function getClientDb() {
    if (db) return db;

    db = getFirestore(getClientApp());
    if (process.env.NODE_ENV === 'development' && !global.__dbEmulatorConnected) {
        console.log("Connecting to Firestore emulator");
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        global.__dbEmulatorConnected = true;
    }
    return db;
}

export function getClientFunctions() {
    if (functions) return functions;

    functions = getFunctions(getClientApp(), 'us-central1');
    if (process.env.NODE_ENV === 'development' && !global.__functionsEmulatorConnected) {
        console.log("Connecting to Functions emulator");
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
        global.__functionsEmulatorConnected = true;
    }
    return functions;
}
