
'use client';

import type { User } from '@/types'; // Your app's User type
import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup,
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
    
    const currentSearchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirectTo = currentSearchParams?.get('redirect');

    if (redirectTo && redirectTo !== '/login' && redirectTo !== '/signup' && redirectTo !== pathname) {
        router.push(redirectTo);
    } else {
        router.push(redirectPath);
    }
    return firebaseUser;
  };

  const handleAuthError = (error: any, defaultMessage: string, method?: 'google' | 'phone' | 'email') => {
    console.error(`${method || 'Authentication'} error: `, error.code, error.message);
    let description = defaultMessage; // Start with a generic default

    if (error.code) { // Check if error.code exists
        switch (error.code) {
            // Google Sign-In specific errors
            case 'auth/popup-closed-by-user':
                console.warn("Google Sign-In: Popup closed by user.");
                description = 'חלון הכניסה של גוגל נסגר על ידך. נסה שוב.';
                break;
            case 'auth/cancelled-popup-request':
                description = 'בקשת הכניסה עם גוגל בוטלה. נסה שוב.';
                break;
            case 'auth/popup-blocked':
                description = 'חלון הכניסה של גוגל נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים עבור אתר זה.';
                break;
            case 'auth/operation-not-allowed':
                description = 'כניסה עם שיטה זו אינה מאופשרת. פנה לתמיכה.';
                break;
            case 'auth/account-exists-with-different-credential':
                description = 'קיים כבר חשבון עם אימייל זה אך עם שיטת כניסה אחרת. נסה להתחבר בשיטה האחרת.';
                break;
            // Phone Auth specific errors
             case 'auth/invalid-phone-number':
                description = 'מספר הטלפון שהוזן אינו תקין.';
                break;
            case 'auth/too-many-requests':
                description = 'נשלחו יותר מדי בקשות אימות למספר זה. נסה שוב מאוחר יותר.';
                break;
            case 'auth/code-expired':
                description = 'קוד האימות פג תוקף. אנא שלח קוד חדש.';
                break;
            case 'auth/invalid-verification-code':
                description = 'קוד האימות שהוזן אינו נכון.';
                break;
            // Email/Password Auth specific errors
            case 'auth/email-already-in-use':
                description = 'כתובת האימייל כבר בשימוש. נסה להתחבר או להשתמש באימייל אחר.';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': // More generic for email/password
                description = 'אימייל או סיסמה שגויים. אנא נסה שוב.';
                break;
            case 'auth/weak-password':
                description = 'הסיסמה חלשה מדי. אנא בחר סיסמה חזקה יותר (לפחות 6 תווים).';
                break;
            // General Firebase errors
            case 'auth/network-request-failed':
                description = 'אירעה שגיאת רשת. אנא בדוק את חיבור האינטרנט שלך ונסה שוב.';
                break;
            case 'auth/api-key-not-valid':
                 description = 'מפתח ה-API של Firebase אינו תקין. אנא בדוק את הגדרות הפרויקט.';
                 break;
            default:
                // If no specific message, use the defaultMessage or Firebase's message
                description = error.message || defaultMessage; 
        }
    } else {
        description = error.message || defaultMessage;
    }
    
    toast({ title: 'שגיאת אימות', description, variant: 'destructive' });
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
      return handleAuthError(error, 'הכניסה עם גוגל נכשלה.', 'google');
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
      return handleAuthError(error, 'שליחת קוד האימות נכשלה.', 'phone');
    }  finally {
        setIsFirebaseLoading(false);
    }
  };

  const verifyOtpAndLogin = async (confirmationResult: ConfirmationResult, otp: string) => {
    setIsFirebaseLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      await createUserProfileDocument(result.user);
      return handleAuthSuccess(result.user);
    } catch (error: any) {
      return handleAuthError(error, 'אימות הקוד נכשל.', 'phone');
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
      return handleAuthError(error, 'יצירת החשבון נכשלה.', 'email');
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsFirebaseLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, pass);
      return handleAuthSuccess(user);
    } catch (error: any) {
      return handleAuthError(error, 'הכניסה נכשלה. בדוק אימייל וסיסמה.', 'email');
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
