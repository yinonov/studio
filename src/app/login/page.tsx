
'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Smartphone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Inline SVG for Google Icon
const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.25H17.94C17.72 15.53 17.06 16.62 16.06 17.33V19.87H19.61C21.56 18.04 22.56 15.39 22.56 12.25Z" fill="#4285F4"/>
    <path d="M12 23C15.09 23 17.73 21.93 19.61 19.87L16.06 17.33C15.01 18.04 13.63 18.5 12 18.5C8.96 18.5 6.33 16.54 5.29 13.88H1.63V16.43C3.53 20.34 7.48 23 12 23Z" fill="#34A853"/>
    <path d="M5.29 13.88C5.09 13.31 4.98 12.68 4.98 12C4.98 11.32 5.09 10.69 5.29 10.12V7.57H1.63C0.81 9.11 0.32 10.89 0.32 12C0.32 13.11 0.81 14.89 1.63 16.43L5.29 13.88Z" fill="#FBBC05"/>
    <path d="M12 5.5C13.73 5.5 15.19 6.11 16.01 6.89L19.67 3.24C17.73 1.49 15.09 0 12 0C7.48 0 3.53 2.66 1.63 6.57L5.29 9.12C6.33 6.46 8.96 4.5 12 4.5V5.5Z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const { loginWithGoogle, sendOtpToPhone, verifyOtpAndLogin, currentUser, isFirebaseLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl);
    }
  }, [currentUser, router, searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined' && recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          toast({ title: 'שגיאה', description: 'אימות reCAPTCHA פג תוקף. נסה שוב.', variant: 'destructive' });
          if (recaptchaVerifierRef.current) {
             recaptchaVerifierRef.current.render().then((widgetId) => {
               if (typeof widgetId === 'number' && grecaptcha) {
                 grecaptcha.reset(widgetId);
               }
             });
          }
        }
      });
      recaptchaVerifierRef.current.render(); // Render reCAPTCHA on mount
    }
    return () => {
        if (recaptchaVerifierRef.current) {
            // It's good practice to clear the verifier if the component unmounts,
            // though Firebase might handle this internally.
            // For instance, you might call recaptchaVerifierRef.current.clear() or ensure it's cleaned up.
            // However, simple assignment to null is often sufficient for cleanup if Firebase manages the instance.
            recaptchaVerifierRef.current = null;
        }
    };
  }, []);


  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      // Redirect is handled by onAuthStateChanged
    } catch (error: any) {
      toast({ title: 'שגיאה בהתחברות עם גוגל', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!recaptchaVerifierRef.current) {
      toast({ title: 'שגיאה', description: 'reCAPTCHA לא מאותחל.', variant: 'destructive' });
      return;
    }
    if (!phoneNumber.match(/^\+972[0-9]{9}$/)) {
         toast({ title: 'מספר טלפון לא תקין', description: 'אנא הזן מספר טלפון ישראלי מלא, לדוגמה: +972501234567', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    try {
      const result = await sendOtpToPhone(phoneNumber, recaptchaVerifierRef.current);
      if (result) {
        setConfirmationResult(result);
        setIsOtpSent(true);
        toast({ title: 'קוד נשלח', description: 'קוד אימות נשלח למספר הטלפון שלך.' });
      } else {
         toast({ title: 'שגיאה בשליחת קוד', description: 'לא ניתן לשלוח קוד אימות. אנא בדוק את המספר ונסה שוב.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'שגיאה בשליחת קוד', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !otp.match(/^\d{6}$/)) {
      toast({ title: 'קוד לא תקין', description: 'אנא הזן קוד אימות בן 6 ספרות.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtpAndLogin(confirmationResult, otp);
      // Redirect is handled by onAuthStateChanged
    } catch (error: any) {
      toast({ title: 'שגיאה באימות הקוד', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFirebaseLoading && !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
   if (currentUser) { // Already handled by useEffect, but good for initial render
    return null;
  }


  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">התחברות / הרשמה</CardTitle>
          <CardDescription>בחר אחת מאפשרויות ההתחברות</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleGoogleSignIn} 
            variant="outline" 
            className="w-full text-lg py-6"
            disabled={isSubmitting || isFirebaseLoading}
          >
            {isSubmitting || isFirebaseLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            התחבר עם גוגל
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          {!isOtpSent ? (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-md">התחבר עם מספר טלפון (ישראל)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+972501234567"
                  required
                  className="mt-1 bg-background border-input focus:border-primary focus:ring-primary"
                  disabled={isSubmitting || isFirebaseLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || isFirebaseLoading}>
                {isSubmitting || isFirebaseLoading ? <Loader2 className="animate-spin" /> : <Smartphone />}
                שלח קוד אימות
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">נשלח קוד אימות אל {phoneNumber}.</p>
              <div>
                <Label htmlFor="otp" className="text-md">קוד אימות (6 ספרות)</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className="mt-1 bg-background border-input focus:border-primary focus:ring-primary text-center tracking-[0.3em]"
                  disabled={isSubmitting || isFirebaseLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || isFirebaseLoading}>
                {isSubmitting || isFirebaseLoading ? <Loader2 className="animate-spin" /> : <Check />}
                אמת והתחבר
              </Button>
              <Button variant="link" onClick={() => { setIsOtpSent(false); setOtp(''); setConfirmationResult(null); }} disabled={isSubmitting || isFirebaseLoading}>
                שנה מספר טלפון
              </Button>
            </form>
          )}
           <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
        </CardContent>
      </Card>
    </div>
  );
}
