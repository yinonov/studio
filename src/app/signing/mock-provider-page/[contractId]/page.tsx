
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Edit, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateContractData } from '@/firebase/contractServices';
import { useToast } from '@/hooks/use-toast';

// generateStaticParams MUST NOT be here as this is a Client Component

export default function MockSigningProviderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, isFirebaseLoading } = useAuth();

  const contractId = typeof params.contractId === 'string' ? params.contractId : null;
  const userIdFromQuery = searchParams.get('user'); // Example query param

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseLoading && !currentUser) {
      // This page is typically loaded in an iframe where auth context might not be fully available
      // or might differ. For a real provider, auth would be handled by the provider's session.
      // For this mock, we'll proceed if contractId is present.
      console.warn("Mock Signing Page: User not authenticated in parent context, proceeding with mock.");
    }
    if (!contractId) {
        setError("מזהה חוזה חסר. לא ניתן להמשיך.");
    }
    // Verify user from query matches current user if needed, or rely on e-sign provider's auth
    if (currentUser && userIdFromQuery && currentUser.uid !== userIdFromQuery) {
        console.warn("Mock Signing Page: Authenticated user does not match user in query param.");
        // Potentially show an error or warning, but for a mock, this might be overly strict.
    }

  }, [currentUser, isFirebaseLoading, contractId, userIdFromQuery]);

  const handleSimulateSign = async () => {
    if (!contractId) {
      toast({ title: 'שגיאה', description: 'מזהה חוזה לא תקין.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      // In a real e-signature provider flow:
      // 1. The provider would handle the actual signing.
      // 2. Upon completion, the provider would typically call a webhook you set up.
      // 3. That webhook (a backend function) would securely update the contract status in Firestore.

      // For this MOCK simulation, we directly update Firestore from the client.
      // THIS IS NOT SECURE FOR A REAL APPLICATION.
      await updateContractData(contractId, { 
        status: 'completed',
        // Optionally, add who signed and when, based on mock data
        // lastSignedBy: currentUser?.uid || 'mock_user', 
        // signedAt: serverTimestamp() 
      });

      toast({ title: 'הדמיית חתימה', description: 'החוזה סומן כחתום בהצלחה (הדמיה).' });
      
      // Redirect to the success page.
      // In a real embedded scenario, the e-sign provider might control this redirect,
      // or provide a JS event to listen for.
      // Forcing parent redirect if in iframe.
      if (window.parent && window.self !== window.parent) {
          window.parent.location.href = `/signing/success?contractId=${contractId}`;
      } else {
          router.push(`/signing/success?contractId=${contractId}`);
      }

    } catch (err: any) {
      console.error("Error simulating signature:", err);
      setError('הדמיית החתימה נכשלה. ודא שהחוזה קיים ושיש לך הרשאות.');
      toast({ title: 'שגיאה בהדמיית חתימה', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isFirebaseLoading && !currentUser) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">טוען הדמיית ספק חתימות...</p>
      </div>
    );
  }

  if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-destructive">שגיאה</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                    <Button onClick={() => router.push('/')} variant="outline" className="mt-4">חזרה לדף הבית</Button>
                </CardContent>
            </Card>
        </div>
      );
  }
  
  if (!contractId) {
       return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-4 text-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-destructive">שגיאה: מזהה חוזה חסר</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>לא ניתן לטעון את דף החתימה ללא מזהה חוזה.</p>
                </CardContent>
            </Card>
        </div>
      );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 text-right">
      <Card className="w-full max-w-lg shadow-2xl rounded-xl">
        <CardHeader className="text-center bg-muted/50 p-6 rounded-t-xl">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4 border-2 border-primary">
            <Edit className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-foreground">הדמיית ספק חתימה דיגיטלית</CardTitle>
          <CardDescription className="text-md text-muted-foreground mt-2">
            חוזה מספר: <span className="font-mono">{contractId}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="p-6 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 text-center">
            <h3 className="text-xl font-semibold text-primary mb-3">תוכן החוזה (הדמיה)</h3>
            <p className="text-muted-foreground leading-relaxed">
              במערכת אמיתית, תוכן החוזה המלא יוצג כאן למטרות סקירה וחתימה על ידי ספק החתימות הדיגיטליות.
              זהו אזור שמדמה את ממשק החתימה של הספק.
            </p>
            <div className="mt-4 p-4 bg-background rounded shadow text-sm text-left font-mono h-32 overflow-y-auto">
              <p>// Document content placeholder...</p>
              <p>Agreement between Party A and Party B...</p>
              <p>Date: {new Date().toLocaleDateString('he-IL')}</p>
              <p>Contract ID: {contractId}</p>
              <p>User ID (from query): {userIdFromQuery || 'N/A'}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              <strong>לתשומת ליבך:</strong> זהו ממשק הדגמה בלבד. 
              במערכת אמיתית, תהליך החתימה יתבצע דרך ספק חתימות מאובטח.
              לחיצה על הכפתור מטה תסמן את החוזה כחתום ותעביר אותך לדף אישור.
            </p>
          </div>
        </CardContent>
        <CardFooter className="p-6 md:p-8 bg-muted/30 rounded-b-xl">
          <Button 
            onClick={handleSimulateSign} 
            disabled={isProcessing} 
            className="w-full text-lg py-3 font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            {isProcessing ? (
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            ) : (
              <ThumbsUp className="ml-2 h-5 w-5" />
            )}
            {isProcessing ? 'מעבד חתימה...' : 'חתום על המסמך (הדמיה)'}
          </Button>
        </CardFooter>
      </Card>
       <p className="text-xs text-muted-foreground mt-6 text-center max-w-md">
          <strong>הערה למפתחים:</strong> עדכון סטטוס החוזה ל-'completed' מתבצע ישירות מהלקוח בדף זה לצורך הדגמה. בסביבת פרודקשן, ספק החתימות יקרא ל-webhook (פונקציית ענן) שתעדכן את הסטטוס בצורה מאובטחת.
        </p>
    </div>
  );
}
