import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Firebase config for testing
const firebaseConfig = {
  apiKey: 'demo-key',
  authDomain: 'demo-project.firebaseapp.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: 'demo-app-id',
};

export class TestFirebaseHelper {
  private app: any;
  private auth: any;
  private db: any;
  private isEmulatorConnected = false;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);

    this.connectEmulators();
  }

  private connectEmulators() {
    if (!this.isEmulatorConnected && process.env.NODE_ENV === 'test') {
      try {
        connectAuthEmulator(this.auth, 'http://localhost:9099', {
          disableWarnings: true,
        });
        connectFirestoreEmulator(this.db, 'localhost', 8080);
        this.isEmulatorConnected = true;
      } catch (error) {
        console.warn('Firebase emulators not available, using real Firebase');
      }
    }
  }

  async createTestUser(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
  }

  async signInTestUser(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in test user:', error);
      throw error;
    }
  }

  async createTestContract(userId: string, contractData: any) {
    try {
      const contractRef = doc(
        this.db,
        'contracts',
        `test-contract-${Date.now()}`
      );
      await setDoc(contractRef, {
        ownerId: userId,
        ...contractData,
        createdAt: new Date(),
        status: 'draft',
      });
      return contractRef.id;
    } catch (error) {
      console.error('Error creating test contract:', error);
      throw error;
    }
  }

  async getTestContract(contractId: string) {
    try {
      const contractRef = doc(this.db, 'contracts', contractId);
      const docSnap = await getDoc(contractRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Error getting test contract:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}

// Test data generators
export const TestData = {
  user: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'משתמש בדיקה',
  },

  contract: {
    rental: {
      templateId: 'rental',
      title: 'חוזה שכירות - בדיקה',
      formData: {
        party1Name: 'ישראל ישראלי',
        party1Email: 'israel@example.com',
        party2Name: 'שרה לוי',
        party2Email: 'sarah@example.com',
        address: 'הרצל 1, תל אביב',
        rent: '5000',
        contractTitle: 'חוזה שכירות דירה',
      },
    },
  },

  template: {
    rental: {
      id: 'rental',
      title: 'חוזה שכירות דירה',
      category: 'נדלן',
      description: 'תבנית לחוזה שכירות דירה',
      fields: [
        {
          id: 'party1Name',
          label: "שם צד א' (משכיר)",
          type: 'text' as const,
          required: true,
        },
        {
          id: 'party2Name',
          label: "שם צד ב' (שוכר)",
          type: 'text' as const,
          required: true,
        },
        {
          id: 'address',
          label: 'כתובת הנכס',
          type: 'text' as const,
          required: true,
        },
        {
          id: 'rent',
          label: 'שכר דירה חודשי',
          type: 'number' as const,
          required: true,
        },
      ],
    },
  },
};
