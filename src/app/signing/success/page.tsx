'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ThumbsUp } from 'lucide-react';

export default function SigningSuccessPage() {
  const router = useRouter();

  return (
    <div className='flex min-h-[calc(100vh-250px)] items-center justify-center'>
      <Card className='w-full max-w-lg rounded-2xl border-accent/30 bg-accent/5 text-center shadow-xl'>
        <CardHeader>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10'>
            <ThumbsUp className='h-10 w-10 text-accent' />
          </div>
          <CardTitle className='text-3xl font-extrabold text-accent md:text-4xl'>
            החוזה נחתם בהצלחה!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className='text-md mt-2 text-gray-600 md:text-lg'>
            כל הצדדים חתמו על המסמך. עותק סופי של החוזה נשלח לאימייל של כל
            המעורבים.
          </CardDescription>
          <Button
            onClick={() => router.push('/dashboard')}
            className='mt-8 px-8 py-3 text-lg font-semibold'
            size='lg'
          >
            מעבר ללוח הבקרה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
