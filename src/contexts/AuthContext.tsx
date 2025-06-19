
'use client';

import type { User } from '@/types'; // Your app's User type
import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfileDocument } from '@/firebase/userUtils';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isFirebaseLoading: boolean;
  loginWithGoogle: () => Promise<FirebaseUser | null>;
  sendOtpToPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  verifyOtpAndLogin: (confirmationResult: ConfirmationResult, otp: string) => Promise<FirebaseUser | null>;
  signupWithEmail: (email: string, pass: string, additionalData?: Record<string, any>) => Promise<FirebaseUser | null>;
  loginWithEmail: (email: string, pass: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await createUserProfileDocument(firebaseUser); // Ensure profile exists
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          phoneNumber: firebaseUser.phoneNumber,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setCurrentUser(appUser);
      } else {
        setCurrentUser(null);
      }
      setIsFirebaseLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (firebaseUser: FirebaseUser, redirectPath: string = '/dashboard') => {
    const appUser: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      phoneNumber: firebaseUser.phoneNumber,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
    setCurrentUser(appUser);
    router.push(redirectPath);
    return firebaseUser;
  };

  const handleAuthError = (error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    toast({ title: 'שגיאה', description: error.message || defaultMessage, variant: 'destructive' });
    return null;
  };

  const loginWithGoogle = async () => {
    setIsFirebaseLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await createUserProfileDocument(result.user);
      return handleAuthSuccess(result.user);
    } catch (error: any) {
      return handleAuthError(error, 'הכניסה עם גוגל נכשלה.');
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const sendOtpToPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setIsFirebaseLoading(true);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      toast({ title: 'קוד נשלח', description: 'קוד אימות נשלח למספר הטלפון שלך.' });
      return confirmationResult;
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/api-key-not-valid') {
        description = 'מפתח API אינו תקין. בדוק את הגדרות Firebase.';
      } else if (error.code === 'auth/invalid-phone-number') {
        description = 'מספר הטלפון שהוזן אינו תקין.';
      } else if (error.code === 'auth/too-many-requests') {
        description = 'נשלחו יותר מדי בקשות. נסה שוב מאוחר יותר.';
      }
      toast({ title: 'שגיאה בשליחת קוד', description, variant: 'destructive' });
      setIsFirebaseLoading(false);
      return null;
    }
  };

  const verifyOtpAndLogin = async (confirmationResult: ConfirmationResult, otp: string) => {
    setIsFirebaseLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      await createUserProfileDocument(result.user);
      return handleAuthSuccess(result.user);
    } catch (error: any) {
      return handleAuthError(error, 'אימות הקוד נכשל.');
    } finally {
      setIsFirebaseLoading(false);
    }
  };
  
  const signupWithEmail = async (email: string, pass: string, additionalData: Record<string, any> = {}) => {
    setIsFirebaseLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await createUserProfileDocument(user, { ...additionalData, email });
      return handleAuthSuccess(user);
    } catch (error: any) {
      return handleAuthError(error, 'יצירת החשבון נכשלה.');
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsFirebaseLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      // Profile should exist, but good to ensure consistency if needed
      // await createUserProfileDocument(user); 
      return handleAuthSuccess(user);
    } catch (error: any) {
      return handleAuthError(error, 'הכניסה נכשלה.');
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const logout = async () => {
    setIsFirebaseLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      router.push('/'); 
    } catch (error: any) {
      handleAuthError(error, 'ההתנתקות נכשלה.');
    } finally {
      setIsFirebaseLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{ currentUser, isFirebaseLoading, loginWithGoogle, sendOtpToPhone, verifyOtpAndLogin, signupWithEmail, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
