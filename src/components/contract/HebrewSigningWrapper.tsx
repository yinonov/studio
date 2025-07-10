import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HebrewSigningWrapperProps {
  signUrl: string;
  onSign?: () => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

/**
 * Alternative Hebrew-friendly signing interface
 * This wrapper provides Hebrew instructions and context around the embedded signing
 */
export function HebrewSigningWrapper({
  signUrl,
  onSign,
  onCancel,
  onError,
}: HebrewSigningWrapperProps) {
  const [step, setStep] = useState<"instructions" | "signing" | "completed">(
    "instructions"
  );
  const [isLoading, setIsLoading] = useState(false);

  const startSigning = () => {
    setStep("signing");
    setIsLoading(true);

    // Open in new window with Hebrew instructions
    const newWindow = window.open(
      signUrl,
      "hebrew-signing",
      "width=800,height=600,scrollbars=yes,resizable=yes"
    );

    if (newWindow) {
      // Poll for window closure
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
          setStep("completed");
          onSign?.();
        }
      }, 1000);

      // Add Hebrew instructions to the opened window
      setTimeout(() => {
        try {
          if (!newWindow.closed && newWindow.document) {
            const hebrewInstructions = `
              <div style="
                position: fixed; 
                top: 0; 
                left: 0; 
                right: 0; 
                background: #1e40af; 
                color: white; 
                padding: 10px; 
                text-align: center; 
                z-index: 10000;
                font-family: Arial, sans-serif;
                direction: rtl;
              ">
                <strong>הוראות חתימה:</strong> 
                לחץ על "Sign" או על כפתור החתימה כדי לחתום על המסמך
              </div>
            `;
            newWindow.document.body.insertAdjacentHTML(
              "afterbegin",
              hebrewInstructions
            );
          }
        } catch (e) {
          console.warn("Could not inject Hebrew instructions due to CORS");
        }
      }, 2000);
    } else {
      onError?.("לא ניתן לפתוח חלון חתימה. אנא אפשר חלונות קופצים.");
      setStep("instructions");
      setIsLoading(false);
    }
  };

  if (step === "completed") {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            חתימה הושלמה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            תודה! החתימה שלך נשמרה בהצלחה.
          </p>
          <Button
            onClick={() => setStep("instructions")}
            variant="outline"
            className="w-full"
          >
            חזור
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "signing") {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            תהליך חתימה פעיל
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              חלון החתימה נפתח בטאב נפרד. אנא השלם את תהליך החתימה שם.
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          חתימה על מסמך
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>הוראות לחתימה:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 mr-4">
            <li>יישמר חלון חתימה חדש</li>
            <li>בחלון החדש, חפש כפתור "Sign" או "חתימה"</li>
            <li>לחץ על המקום המיועד לחתימה במסמך</li>
            <li>השלם את תהליך החתימה לפי ההוראות</li>
            <li>סגור את החלון כשתסיים</li>
          </ul>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ממשק החתימה יוצג באנגלית, אך תוכל לעקוב אחר ההוראות למעלה.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button onClick={startSigning} className="w-full">
            התחל תהליך חתימה
          </Button>
          <Button onClick={onCancel} variant="outline" className="w-full">
            ביטול
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
