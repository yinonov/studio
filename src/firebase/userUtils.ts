import { doc, setDoc, getDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

interface UserProfileData {
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  subscriptionTier: string;
  [key: string]: any; 
}

export const createUserProfileDocument = async (userAuth: FirebaseUser, additionalData: Record<string, any> = {}) => {
  if (!userAuth) return;
  
  const db = getClientDb();
  const userRef = doc(db, `users/${userAuth.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { displayName, email, phoneNumber, photoURL } = userAuth;
    const profileData: UserProfileData = {
      displayName: displayName || email || 'משתמש חדש',
      email,
      phoneNumber,
      photoURL,
      createdAt: serverTimestamp() as Timestamp, // Cast needed as serverTimestamp returns a sentinel
      subscriptionTier: 'free',
      ...additionalData,
    };
    try {
      await setDoc(userRef, profileData);
    } catch (error) {
      console.error("Error creating user document", error);
      throw error; // Re-throw to be caught by caller
    }
  }
  return userRef;
};

export const getUserProfile = async (uid: string) => {
  if (!uid) return null;
  const db = getClientDb();
  const userRef = doc(db, `users/${uid}`);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return { uid, ...snapshot.data() };
  }
  return null;
};
