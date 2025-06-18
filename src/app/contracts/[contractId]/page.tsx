
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignaturePad from '@/components/contract/SignaturePad';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentDateParts } from '@/data/templates';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Printer, Download, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { StoredContractData } from '@/types';
import { useToast } from '@/hooks/use-toast';

const CONTRACTS_STORAGE_KEY = 'chetzContracts';

// Simplified interpolation for preview on this page.
const interpolateStoredClause = (clause: string, data: Record<string, any>): string => {
  return clause.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || `[${key}]`;
  });
};

export default function ContractDisplayPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const contractId = typeof params.contractId === 'string' ? params.contractId : null;

  const [contractData, setContractData] = useState<StoredContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedByParty1, setIsSignedByParty1] = useState(false);
  const [isSignedByParty2, setIsSignedByParty2] = useState(false);
  const [baseClausesText, setBaseClausesText] = useState<string>('');

  useEffect(() => {
    if (authIsLoading) return;

    if (!currentUser) {
      router.push(contractId ? `/login?redirect=/contracts/${contractId}` : '/login');
      return;
    }

    if (typeof window !== 'undefined' && contractId) {
      const allContractsString = localStorage.getItem(CONTRACTS_STORAGE_KEY);
      if (allContractsString) {
        try {
          const allContracts: StoredContractData[] = JSON.parse(allContractsString);
          const currentContract = allContracts.find(c => c.id === contractId);

          if (currentContract) {
            // Basic auth check: is the current user the owner?
            // In a real app, you'd also check a sharedWith array.
            if (currentContract.ownerId !== currentUser.id) {
               toast({
                title: 'גישה נדחתה',
                description: 'אין לך הרשאה לצפות בחוזה זה.',
                variant: 'destructive',
              });
              router.push('/templates'); // Or a "my contracts" page
              return;
            }

            setContractData(currentContract);

            if (currentContract.templateId) {
              import('@/data/templates').then(module => {
                const template = module.getTemplateById(currentContract.templateId);
                if (template) {
                  const dateParts = getCurrentDateParts();
                  const fullFormData = { ...currentContract.formData, ...dateParts };
                  const interpolatedBaseClauses = template.baseClauses.map(clause => interpolateStoredClause(clause, fullFormData)).join('\n\n');
                  setBaseClausesText(interpolatedBaseClauses);
                }
              });
            }
          } else {
             toast({
                title: 'שגיאה',
                description: 'החוזה המבוקש לא נמצא.',
                variant: 'destructive',
              });
              router.push('/templates');
          }
        } catch (error) {
          console.error("Failed to parse contracts from localStorage", error);
           toast({
            title: 'שגיאה בטעינת החוזה',
            description: 'אירעה בעיה בטעינת נתוני החוזה.',
            variant: 'destructive',
          });
          router.push('/templates');
        }
      } else {
         toast({
            title: 'שגיאה',
            description: 'לא נמצאו חוזים שמורים.',
            variant: 'destructive',
          });
        router.push('/templates');
      }
      setIsLoading(false);
    } else if (!contractId) {
      toast({ title: 'שגיאה', description: 'מזהה חוזה חסר.', variant: 'destructive' });
      router.push('/templates');
      setIsLoading(false);
    }
  }, [contractId, currentUser, authIsLoading, router, toast]);
  
  const party1Name = contractData?.formData?.landlordName || contractData?.formData?.serviceProviderName || contractData?.formData?.employerName || "צד א'";
  const party2Name = contractData?.formData?.tenantName || contractData?.formData?.clientName || contractData?.formData?.employeeName || "צד ב'";

  if (authIsLoading || isLoading) {
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
    // Message already shown by toast, this is a fallback.
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">טוען נתוני חוזה או שלא נמצא חוזה...</p>
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
          {contractData.templateName || 'חוזה'} <span className="text-sm text-muted-foreground">(ID: {contractData.id})</span>
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
            <Printer /> הדפס חוזה
          </Button>
          <Button variant="outline" disabled>
            <Download /> הורד כ-PDF (בקרוב)
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
            <HomeIcon />
            חזרה לדף הבית
          </Link>
        </Button>
      </div>
    </div>
  );
}
