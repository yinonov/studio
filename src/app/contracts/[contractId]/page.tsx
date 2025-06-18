'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignaturePad from '@/components/contract/SignaturePad';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentDateParts } from '@/data/templates'; // Re-use for consistent date formatting
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Printer, Download, Home as HomeIcon } from 'lucide-react';


interface StoredContractData {
  templateId: string;
  templateName?: string;
  formData: Record<string, any>;
  customClauses: { description: string; legalWording: string }[];
  createdAt: string;
}

// Simplified interpolation for preview on this page.
// In a real app, this logic might be shared or more robust.
const interpolateStoredClause = (clause: string, data: Record<string, any>): string => {
  return clause.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || `[${key}]`;
  });
};

export default function ContractDisplayPage() {
  const params = useParams();
  const contractId = params.contractId; // In this demo, it's 'dummy-contract-id'

  const [contractData, setContractData] = useState<StoredContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedByParty1, setIsSignedByParty1] = useState(false);
  const [isSignedByParty2, setIsSignedByParty2] = useState(false);
  const [baseClausesText, setBaseClausesText] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('currentContract');
      if (storedData) {
        const parsedData: StoredContractData = JSON.parse(storedData);
        setContractData(parsedData);

        // Simulate fetching base clauses if needed or reconstruct text
        // For demo, we'll re-fetch template (simplified)
        // Ideally, full contract text would be saved, or template structure more accessible
        if (parsedData.templateId) {
          // This is a simplified stand-in. Real app would fetch full template.
          // For now, let's assume we might need to reconstruct the text or it was saved fully.
          // This section would be more complex in a real app.
          // Let's just show a placeholder if we don't have base clauses directly.
          
          // Attempt to dynamically load templates to get baseClauses.
          // This is not ideal for a production app (dynamic imports in useEffect can be tricky)
          // but for demo purposes:
          import('@/data/templates').then(module => {
            const template = module.getTemplateById(parsedData.templateId);
            if (template) {
              const dateParts = getCurrentDateParts();
              const fullFormData = { ...parsedData.formData, ...dateParts };
              const interpolatedBaseClauses = template.baseClauses.map(clause => interpolateStoredClause(clause, fullFormData)).join('\n\n');
              setBaseClausesText(interpolatedBaseClauses);
            }
          });
        }

      }
      setIsLoading(false);
    }
  }, []);
  
  const party1Name = contractData?.formData?.landlordName || contractData?.formData?.serviceProviderName || contractData?.formData?.employerName || "צד א'";
  const party2Name = contractData?.formData?.tenantName || contractData?.formData?.clientName || contractData?.formData?.employeeName || "צד ב'";


  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-destructive">לא נמצא חוזה להצגה.</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/templates">חזור למאגר התבניות</Link>
        </Button>
      </div>
    );
  }

  const customClausesText = contractData.customClauses.map(c => c.legalWording).join('\n\n');

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-4xl mx-auto">
      <header className="text-center border-b pb-6 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground/90">
          {contractData.templateName || 'חוזה'}
        </h1>
        <p className="text-md text-muted-foreground mt-2">
          נוצר בתאריך: {new Date(contractData.createdAt).toLocaleDateString('he-IL')}
        </p>
      </header>

      <Card className="shadow-xl border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl font-headline text-primary-foreground/80">תוכן החוזה</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ScrollArea className="h-[400px] md:h-[500px] border border-muted p-4 rounded-md bg-white shadow-inner">
            <div className="whitespace-pre-wrap text-sm leading-relaxed font-body">
              {baseClausesText || <p className="text-muted-foreground">טוען תוכן בסיסי של החוזה...</p>}
              {customClausesText && (
                <>
                  {baseClausesText ? '\n\n' : ''}
                  <p className="font-bold mt-4 mb-2">סעיפים מותאמים אישית:</p>
                  {customClausesText}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <div className="flex flex-col md:flex-row gap-4 justify-center mt-6">
          <Button variant="outline" onClick={() => typeof window !== "undefined" && window.print()}>
            <Printer className="mr-2 h-4 w-4" /> הדפס חוזה
          </Button>
          <Button variant="outline" disabled> {/* Placeholder for download */}
            <Download className="mr-2 h-4 w-4" /> הורד כ-PDF (בקרוב)
          </Button>
        </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-center mb-8 text-primary-foreground/80">חתימות הצדדים</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <SignaturePad 
            partyName={party1Name}
            onSign={() => setIsSignedByParty1(true)}
            isSigned={isSignedByParty1}
          />
          <SignaturePad 
            partyName={party2Name}
            onSign={() => setIsSignedByParty2(true)}
            isSigned={isSignedByParty2}
          />
        </div>
      </section>

      {isSignedByParty1 && isSignedByParty2 && (
        <Card className="mt-10 bg-green-50 border-green-200 text-center p-6 shadow-lg">
          <CardTitle className="text-2xl text-green-700">החוזה נחתם על ידי שני הצדדים!</CardTitle>
          <CardDescription className="text-green-600 mt-2">
            עותק של החוזה החתום ישלח לדוא"ל של כל הצדדים (הדמיה).
          </CardDescription>
        </Card>
      )}
      
      <div className="text-center mt-12">
        <Button asChild variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/">
            <HomeIcon className="mr-2 h-5 w-5" />
            חזרה לדף הבית
          </Link>
        </Button>
      </div>
    </div>
  );
}
