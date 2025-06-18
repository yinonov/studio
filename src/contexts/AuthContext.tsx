
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
      // onAuthStateChanged will handle setting currentUser and redirecting
      router.push('/'); 
    } catch (error) {
      console.error("Google sign-in error", error);
      // Handle error (e.g., show toast)
    } finally {
      //setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };

  const sendOtpToPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult | null> => {
    setIsFirebaseLoading(true);
    const phoneProvider = new PhoneAuthProvider(auth);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error) {
      console.error("Phone OTP send error", error);
      // Handle error (e.g., show toast for invalid phone number, reCAPTCHA error)
      setIsFirebaseLoading(false);
      return null;
    }
    //setIsFirebaseLoading(false); // Loading should persist until OTP verification or failure
  };

  const verifyOtpAndLogin = async (confirmationResult: ConfirmationResult, otp: string) => {
    setIsFirebaseLoading(true);
    try {
      await confirmationResult.confirm(otp);
      // onAuthStateChanged will handle setting currentUser and redirecting
      router.push('/');
    } catch (error) {
      console.error("Phone OTP verification error", error);
      // Handle error (e.g., show toast for invalid OTP)
    } finally {
      //setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };

  const logout = async () => {
    setIsFirebaseLoading(true);
    try {
      await signOut(auth);
      router.push('/'); // Redirect to home on logout
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      //setIsFirebaseLoading(false); // Handled by onAuthStateChanged
    }
  };
  
  //isLoading prop for components is now isFirebaseLoading to avoid name clashes
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
