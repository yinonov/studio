
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThumbsUp, CheckCircle } from 'lucide-react'; // Or PartyPopper

export default function SigningSuccessPage() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-250px)]">
      <Card className="w-full max-w-lg text-center shadow-xl border-green-500/30 bg-green-500/5">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <ThumbsUp className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-extrabold text-green-700">החוזה נחתם בהצלחה!</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mt-2 text-md md:text-lg text-green-600">
            כל הצדדים חתמו על המסמך. עותק סופי של החוזה נשלח לאימייל של כל המעורבים.
          </CardDescription>
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg"
            size="lg"
          >
            מעבר ללוח הבקרה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
