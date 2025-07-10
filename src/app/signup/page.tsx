'use client';

import { useState, type FormEvent } from 'react';
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
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import FormInput from '@/components/shared/FormInput';

export default function SignupPage() {
  const { signupWithEmail, currentUser, isFirebaseLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentUser) {
    router.push('/dashboard');
    return null;
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      setIsSubmitting(false);
      return;
    }
    await signupWithEmail(email, password);
    setIsSubmitting(false);
  };

  if (isFirebaseLoading && !currentUser) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center py-8 md:py-12'>
      <Card className='w-full max-w-md rounded-2xl shadow-lg'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold text-gray-900 sm:text-3xl'>
            יצירת חשבון חדש
          </CardTitle>
          <CardDescription className='text-gray-600'>
            הצטרף לפלטפורמת החוזים החכמים
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 px-4 pb-6 sm:space-y-6 sm:px-8 sm:pb-8'>
          <form onSubmit={handleSignup} className='space-y-4 sm:space-y-6'>
            <FormInput
              label='אימייל'
              name='email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='you@example.com'
              required
            />
            <FormInput
              label='סיסמה'
              name='password'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder='לפחות 6 תווים'
              required
            />
            {error && (
              <p className='text-right text-sm text-destructive'>{error}</p>
            )}
            <Button
              type='submit'
              className='w-full py-3 font-semibold'
              disabled={isSubmitting || isFirebaseLoading}
            >
              {isSubmitting ? <Loader2 className='animate-spin' /> : 'הרשמה'}
            </Button>
          </form>
          <p className='pt-4 text-center text-xs text-gray-600 sm:text-sm'>
            יש לך כבר חשבון?{' '}
            <Link
              href='/login'
              className='font-semibold text-primary hover:underline'
            >
              התחבר/י
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
