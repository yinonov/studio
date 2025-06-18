
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ExternalLink } from 'lucide-react'; // Updated Edit2 to ExternalLink

interface SignaturePadProps {
  partyName: string;
  onSign: () => void;
  isSigned: boolean;
}

export default function SignaturePad({ partyName, onSign, isSigned }: SignaturePadProps) {
  // No 'signing' state needed as the actual signing process would be handled by the embedded tool.

  const handleInitiateSignature = () => {
    // In a real scenario, this would initialize and display the
    // embedded signing UI from the third-party service.
    // For this demonstration, we directly call onSign to simulate completion.
    onSign();
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-xl font-headline text-primary-foreground/90">חתימה דיגיטלית</CardTitle>
        <CardDescription className="text-muted-foreground">חתימה עבור: {partyName}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {isSigned ? (
          <div className="flex flex-col items-center justify-center h-32 bg-green-50 rounded-md border border-green-200">
            <Check className="w-12 h-12 text-green-600 mb-2" />
            <p className="font-semibold text-green-700">החוזה נחתם בהצלחה!</p>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-center space-y-3 p-4 border border-dashed border-muted-foreground/30 rounded-md bg-background">
            {/* Using an inline SVG for ShieldCheck to ensure availability and thematic consistency */}
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary opacity-75">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <p className="text-sm text-muted-foreground">
              יוטען כאן ממשק חתימה מאובטח של ספק חיצוני.
            </p>
          </div>
        )}
      </CardContent>
      {!isSigned && (
        <CardFooter className="p-6 flex-col items-center">
          <Button onClick={handleInitiateSignature} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <ExternalLink className="mr-2 h-4 w-4" />
            התחל תהליך חתימה
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            (הדגמה: לחיצה תסמן כחתום. במערכת אמיתית, יופעל כאן ממשק חתימה משובץ של ספק חיצוני.)
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
