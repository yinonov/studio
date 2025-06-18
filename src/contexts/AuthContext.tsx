
'use client';

import type { User } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Assuming firebase.ts is in src/lib
import { useToast } from '@/hooks/use-toast';


interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  sendOtpToPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult | null>;
  verifyOtpAndLogin: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isFirebaseLoading: boolean; // Renamed from isLoading to avoid conflict if component has its own isLoading
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast(); // Added useToast

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          phoneNumber: firebaseUser.phoneNumber,
          displayName: firebaseUser.displayName,
        };
        setCurrentUser(appUser);
      } else {
        setCurrentUser(null);
      }
      setIsFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsFirebaseLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting currentUser
      // router.push('/'); // Redirect is handled by useEffect in login page or onAuthStateChanged listeners elsewhere
    } catch (error: any) {
      console.error("Google sign-in error", error);
      toast({ title: 'שגיאה בהתחברות עם גוגל', description: error.message, variant: 'destructive' });
    } finally {
      // setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };

  const sendOtpToPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setIsFirebaseLoading(true);
    try {
      // No need to create PhoneAuthProvider instance explicitly for signInWithPhoneNumber
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      // If successful, loading should persist until OTP verification or failure.
      // setIsFirebaseLoading(false) is not called here intentionally.
      return confirmationResult;
    } catch (error: any) {
      console.error("Phone OTP send error", error);
      let description = error.message;
      if (error.code === 'auth/api-key-not-valid') {
        description = 'Firebase API Key is not valid. Please check your Firebase project configuration and .env file. Ensure Phone Sign-in is enabled and the API key has permissions for Identity Toolkit API.';
      } else if (error.code === 'auth/invalid-phone-number') {
        description = 'מספר הטלפון שהוזן אינו תקין.';
      } else if (error.code === 'auth/too-many-requests') {
        description = 'נשלחו יותר מדי בקשות. נסה שוב מאוחר יותר.';
      }
      // Make sure toast is available or pass it as a dependency
      toast({ title: 'שגיאה בשליחת קוד', description, variant: 'destructive' });
      setIsFirebaseLoading(false);
      return null;
    }
  };

  const verifyOtpAndLogin = async (confirmationResult: ConfirmationResult, otp: string) => {
    setIsFirebaseLoading(true);
    try {
      await confirmationResult.confirm(otp);
      // onAuthStateChanged will handle setting currentUser
      // router.push('/'); // Redirect is handled by useEffect in login page or onAuthStateChanged listeners elsewhere
    } catch (error: any) {
      console.error("Phone OTP verification error", error);
      let description = error.message;
      if (error.code === 'auth/invalid-verification-code') {
        description = 'קוד האימות שהוזן אינו תקין.';
      } else if (error.code === 'auth/code-expired') {
        description = 'קוד האימות פג תוקף. אנא שלח קוד חדש.';
      }
       toast({ title: 'שגיאה באימות הקוד', description, variant: 'destructive' });
    } finally {
      // setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };

  const logout = async () => {
    setIsFirebaseLoading(true);
    try {
      await signOut(auth);
      router.push('/'); // Redirect to home on logout
    } catch (error: any) {
      console.error("Logout error", error);
      toast({ title: 'שגיאה בהתנתקות', description: error.message, variant: 'destructive' });
    } finally {
      //setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };
  
  return (
    <AuthContext.Provider value={{ currentUser, isLoading: isFirebaseLoading, loginWithGoogle, sendOtpToPhone, verifyOtpAndLogin, logout, isFirebaseLoading }}>
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

