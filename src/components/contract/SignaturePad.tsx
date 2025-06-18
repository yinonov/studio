'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Edit2 } from 'lucide-react';

interface SignaturePadProps {
  partyName: string;
  onSign: () => void;
  isSigned: boolean;
}

export default function SignaturePad({ partyName, onSign, isSigned }: SignaturePadProps) {
  const [signing, setSigning] = useState(false);

  const handleSign = () => {
    setSigning(true);
    // Simulate signing process
    setTimeout(() => {
      onSign();
      setSigning(false);
    }, 1500);
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
          <div className="h-32 border-2 border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center bg-background cursor-pointer hover:border-primary transition-colors"
               onClick={!signing ? handleSign : undefined}
               role="button"
               tabIndex={0}
               aria-label="אזור חתימה, לחץ לחתימה"
          >
            {signing ? (
              <p className="text-primary">חותם...</p>
            ) : (
              <p className="text-muted-foreground">לחץ כאן כדי לחתום</p>
            )}
            
          </div>
        )}
         <p className="text-xs text-muted-foreground mt-2 text-center">
              (זוהי הדגמה של חתימה דיגיטלית. במערכת אמיתית ישולב מנגנון חתימה מאובטח.)
            </p>
      </CardContent>
      {!isSigned && (
        <CardFooter className="p-6">
          <Button onClick={handleSign} disabled={signing} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            <Edit2 className="mr-2 h-4 w-4" />
            {signing ? 'בתהליך חתימה...' : 'אשר חתימה'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
