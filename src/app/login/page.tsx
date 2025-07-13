'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';
import Link from 'next/link';
import FormInput from '@/components/shared/FormInput';

const GoogleIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 48 48'
    className='h-5 w-5 sm:h-6 sm:w-6'
  >
    <path
      fill='#FFC107'
      d='M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z'
    ></path>
    <path
      fill='#FF3D00'
      d='M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z'
    ></path>
    <path
      fill='#4CAF50'
      d='M24 44c5.166 0 9.6-1.977 12.6-5.251l-6.522-4.999c-2.17 1.451-4.945 2.251-7.979 2.251-5.22 0-9.645-3.337-11.305-7.952l-6.571 4.819C9.656 39.663 16.318 44 24 44z'
    ></path>
    <path
      fill='#1976D2'
      d='M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.522 4.999c3.926-3.627 6.261-8.945 6.261-14.655c0-1.341-.138-2.65-.389-3.917z'
    ></path>
  </svg>
);

export default function LoginPage() {
  const {
    loginWithGoogle,
    sendOtpToPhone,
    verifyOtpAndLogin,
    loginWithEmail,
    currentUser,
    isFirebaseLoading,
  } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhoneState] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    // This effect manages the RecaptchaVerifier lifecycle for phone authentication
    if (
      authMethod === 'phone' &&
      !confirmationResult &&
      typeof window !== 'undefined' &&
      recaptchaContainerRef.current
    ) {
      if (!recaptchaVerifierRef.current) {
        // Only initialize if not already present
        const auth = getClientAuth();
        const verifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current,
          {
            size: 'invisible',
            callback: () => {
              /* reCAPTCHA solved */
            },
            'expired-callback': () => {
              toast({
                title: 'שגיאה',
                description: 'אימות reCAPTCHA פג תוקף. נסה שוב.',
                variant: 'destructive',
              });
              // Optionally, try to re-render or clear and re-initialize
              if (recaptchaVerifierRef.current) {
                try {
                  (recaptchaVerifierRef.current as any).clear();
                } catch {
                  // Ignore clear errors
                }
                recaptchaVerifierRef.current = null;
              }
            },
          }
        );
        verifier
          .render()
          .then(() => {
            recaptchaVerifierRef.current = verifier;
          })
          .catch(err => {
            console.error('Recaptcha render error:', err);
            toast({
              title: 'שגיאת reCAPTCHA',
              description: 'לא ניתן להציג את reCAPTCHA. ודא שהדפדפן מאפשר זאת.',
              variant: 'destructive',
            });
            if (recaptchaVerifierRef.current) {
              // Attempt to clear if render fails
              try {
                (recaptchaVerifierRef.current as any).clear();
              } catch {
                // Ignore clear errors
              }
            }
            recaptchaVerifierRef.current = null;
          });
      }
    }

    return () => {
      // Cleanup function
      const currentVerifier = recaptchaVerifierRef.current;
      if (currentVerifier) {
        try {
          (currentVerifier as any).clear();
        } catch (e) {
          console.warn('Error clearing RecaptchaVerifier on cleanup:', e);
        }
        recaptchaVerifierRef.current = null;
        // Remove the reCAPTCHA badge from the DOM
        const badge = document.querySelector('.grecaptcha-badge');
        if (badge?.parentElement) {
          badge.parentElement.removeChild(badge);
        }
      }
    };
  }, [authMethod, confirmationResult, toast]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError('');
    await loginWithGoogle();
    setIsSubmitting(false);
  };

  const handlePhoneSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    if (!recaptchaVerifierRef.current) {
      toast({
        title: 'שגיאה',
        description: 'reCAPTCHA לא מאותחל. אנא המתן או רענן את הדף.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    const appVerifier = recaptchaVerifierRef.current;
    const israeliPhoneNumber = `+972${phone.replace(/^0+/, '')}`;
    if (!israeliPhoneNumber.match(/^\+972[0-9]{9}$/)) {
      toast({
        title: 'מספר טלפון לא תקין',
        description:
          'אנא הזן מספר טלפון ישראלי תקין המתחיל ב-05 ולאחר מכן 8 ספרות.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    const result = await sendOtpToPhone(israeliPhoneNumber, appVerifier);
    if (result) setConfirmationResult(result);
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    if (!confirmationResult) {
      setError('שגיאה בתהליך האימות, נסה לשלוח קוד שוב.');
      setIsSubmitting(false);
      return;
    }
    if (!otp.match(/^\d{6}$/)) {
      toast({
        title: 'קוד לא תקין',
        description: 'אנא הזן קוד אימות בן 6 ספרות.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    await verifyOtpAndLogin(confirmationResult, otp);
    setIsSubmitting(false);
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    await loginWithEmail(email, password);
    setIsSubmitting(false);
  };

  if (isFirebaseLoading && !currentUser) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }
  if (currentUser) return null;

  return (
    <div className='flex items-center justify-center py-8 md:py-12'>
      <Card className='w-full max-w-md rounded-2xl shadow-lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold text-gray-900 sm:text-3xl'>
            כניסה / הרשמה
          </CardTitle>
          <CardDescription className='text-gray-600'>
            התחבר כדי לנהל את החוזים שלך
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 px-4 pb-6 sm:space-y-6 sm:px-8 sm:pb-8'>
          <div
            id='recaptcha-container'
            ref={recaptchaContainerRef}
            className='my-2'
          ></div>
          <Button
            onClick={handleGoogleSignIn}
            variant='outline'
            className='w-full py-3 text-base font-semibold'
            disabled={isSubmitting || isFirebaseLoading}
          >
            {isSubmitting ? (
              <Loader2 className='animate-spin' />
            ) : (
              <GoogleIcon />
            )}
            המשך/י עם גוגל
          </Button>

          <div className='relative flex items-center py-3'>
            <div className='flex-grow border-t border-gray-300'></div>
            <span className='mx-4 flex-shrink text-sm text-gray-500'>או</span>
            <div className='flex-grow border-t border-gray-300'></div>
          </div>

          <div className='flex justify-center rounded-lg border border-gray-300 bg-gray-100 p-1'>
            <Button
              onClick={() => {
                setAuthMethod('email');
                setError('');
                setConfirmationResult(null);
              }}
              variant={authMethod === 'email' ? 'secondary' : 'ghost'}
              className={`w-1/2 py-2 transition-shadow duration-300 ${
                authMethod === 'email'
                  ? '!bg-white shadow-md'
                  : 'text-gray-600 hover:!bg-gray-200'
              }`}
            >
              <Mail className='ml-2 h-4 w-4' />
              אימייל
            </Button>
            <Button
              onClick={() => {
                setAuthMethod('phone');
                setError('');
              }}
              variant={authMethod === 'phone' ? 'secondary' : 'ghost'}
              className={`w-1/2 py-2 transition-shadow duration-300 ${
                authMethod === 'phone'
                  ? '!bg-white shadow-md'
                  : 'text-gray-600 hover:!bg-gray-200'
              }`}
            >
              <Phone className='ml-2 h-4 w-4' />
              טלפון
            </Button>
          </div>

          {authMethod === 'email' ? (
            <form
              onSubmit={handleEmailLogin}
              className='space-y-4 sm:space-y-6'
            >
              <FormInput
                label='אימייל'
                name='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='you@example.com'
              />
              <FormInput
                label='סיסמה'
                name='password'
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='••••••••'
              />
              <Button
                type='submit'
                className='w-full py-3 font-semibold'
                disabled={isSubmitting || isFirebaseLoading}
              >
                {isSubmitting ? <Loader2 className='animate-spin' /> : 'כניסה'}
              </Button>
            </form>
          ) : !confirmationResult ? (
            <form
              onSubmit={handlePhoneSignIn}
              className='space-y-4 sm:space-y-6'
            >
              <FormInput
                label='מספר טלפון'
                name='phone'
                type='tel'
                value={phone}
                onChange={e => setPhoneState(e.target.value)}
                placeholder='05X-XXX-XXXX'
                inputClassName='pr-12 text-left'
              >
                <span className='absolute right-3 text-muted-foreground'>
                  +972
                </span>
              </FormInput>
              <Button
                type='submit'
                className='w-full py-3 font-semibold'
                disabled={isSubmitting || isFirebaseLoading}
              >
                {isSubmitting ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  'שלח קוד אימות'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className='space-y-4 sm:space-y-6'>
              <FormInput
                label='קוד אימות'
                name='otp'
                type='text'
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder='הזן קוד בן 6 ספרות'
              />
              <Button
                type='submit'
                variant='accent'
                className='w-full py-3 font-semibold'
                disabled={isSubmitting || isFirebaseLoading}
              >
                {isSubmitting ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <ShieldCheck />
                )}
                אימות וכניסה
              </Button>
              <Button
                variant='link'
                onClick={() => {
                  setConfirmationResult(null);
                  setOtp('');
                  setError('');
                }}
                disabled={isSubmitting}
              >
                שנה מספר או נסה שוב
              </Button>
            </form>
          )}
          {error && (
            <p className='mt-4 text-center text-sm text-destructive'>{error}</p>
          )}
          <p className='pt-4 text-center text-xs text-gray-600 sm:text-sm'>
            חדש פה?{' '}
            <Link
              href='/signup'
              className='font-semibold text-primary hover:underline'
            >
              צור חשבון
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
