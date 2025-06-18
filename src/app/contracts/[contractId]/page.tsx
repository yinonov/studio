
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import SignaturePad from '@/components/contract/SignaturePad';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentDateParts } from '@/data/templates';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Printer, Download, Home as HomeIcon, Share2, Users, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { StoredContractData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser, isFirebaseLoading } = useAuth(); // use isFirebaseLoading
  const contractId = typeof params.contractId === 'string' ? params.contractId : null;

  const [contractData, setContractData] = useState<StoredContractData | null>(null);
  const [isPageSpecificLoading, setIsPageSpecificLoading] = useState(true);
  const [isSignedByParty1, setIsSignedByParty1] = useState(false);
  const [isSignedByParty2, setIsSignedByParty2] = useState(false);
  const [baseClausesText, setBaseClausesText] = useState<string>('');
  const [shareEmail, setShareEmail] = useState('');

  useEffect(() => {
    if (isFirebaseLoading) return; // Wait for Firebase auth state

    if (!currentUser) {
      const currentPath = `/contracts/${contractId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (typeof window !== 'undefined' && contractId) {
      const allContractsString = localStorage.getItem(CONTRACTS_STORAGE_KEY);
      if (allContractsString) {
        try {
          const allContracts: StoredContractData[] = JSON.parse(allContractsString);
          const currentContract = allContracts.find(c => c.id === contractId);

          if (currentContract) {
            // Authorization check: owner or shared with?
            // ownerId is UID, sharedWith is array of emails. currentUser.uid and currentUser.email
            const isOwner = currentContract.ownerId === currentUser.uid;
            const isSharedWithUser = !!(currentUser.email && currentContract.sharedWith?.includes(currentUser.email));
            
            if (!isOwner && !isSharedWithUser) {
               toast({
                title: 'גישה נדחתה',
                description: 'אין לך הרשאה לצפות בחוזה זה.',
                variant: 'destructive',
              });
              router.push('/templates'); 
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
      setIsPageSpecificLoading(false);
    } else if (!contractId) {
      toast({ title: 'שגיאה', description: 'מזהה חוזה חסר.', variant: 'destructive' });
      router.push('/templates');
      setIsPageSpecificLoading(false);
    }
  }, [contractId, currentUser, isFirebaseLoading, router, toast, searchParams]);

  const handleShareContract = (e: FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim() || !contractData || !currentUser || currentUser.uid !== contractData.ownerId) {
      toast({ title: 'שגיאה', description: 'לא ניתן לשתף. ודא שאתה הבעלים והזנת כתובת אימייל.', variant: 'destructive'});
      return;
    }
    // Cannot share with self if owner's email is entered
    if (currentUser.email && shareEmail.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      toast({ title: 'מידע', description: 'לא ניתן לשתף חוזה עם הבעלים שלו.', variant: 'default'});
      return;
    }


    try {
      const allContractsString = localStorage.getItem(CONTRACTS_STORAGE_KEY);
      let allContracts: StoredContractData[] = allContractsString ? JSON.parse(allContractsString) : [];
      
      const contractIndex = allContracts.findIndex(c => c.id === contractData.id);
      if (contractIndex === -1) {
        toast({ title: 'שגיאה', description: 'החוזה לא נמצא לשיתוף.', variant: 'destructive'});
        return;
      }

      const updatedContract = { ...allContracts[contractIndex] };
      updatedContract.sharedWith = updatedContract.sharedWith || [];
      if (!updatedContract.sharedWith.includes(shareEmail.trim().toLowerCase())) {
        updatedContract.sharedWith.push(shareEmail.trim().toLowerCase());
      } else {
        toast({ title: 'מידע', description: 'החוזה כבר משותף עם משתמש זה.', variant: 'default'});
        setShareEmail('');
        return;
      }
      
      allContracts[contractIndex] = updatedContract;
      localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(allContracts));
      setContractData(updatedContract); 
      setShareEmail('');
      toast({ title: 'הצלחה', description: `החוזה שותף עם ${shareEmail.trim()}`});

    } catch (error) {
      console.error("Failed to share contract", error);
      toast({ title: 'שגיאה בשיתוף', description: 'לא ניתן היה לשתף את החוזה.', variant: 'destructive'});
    }
  };
  
  const handleRemoveSharedUser = (emailToRemove: string) => {
    if (!contractData || !currentUser || currentUser.uid !== contractData.ownerId) return;

    try {
      const allContractsString = localStorage.getItem(CONTRACTS_STORAGE_KEY);
      let allContracts: StoredContractData[] = allContractsString ? JSON.parse(allContractsString) : [];
      
      const contractIndex = allContracts.findIndex(c => c.id === contractData.id);
      if (contractIndex === -1) return;

      const updatedContract = { ...allContracts[contractIndex] };
      updatedContract.sharedWith = (updatedContract.sharedWith || []).filter(email => email !== emailToRemove);
      
      allContracts[contractIndex] = updatedContract;
      localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(allContracts));
      setContractData(updatedContract);
      toast({ title: 'הצלחה', description: `השיתוף עם ${emailToRemove} בוטל.`});

    } catch (error) {
      console.error("Failed to remove shared user", error);
      toast({ title: 'שגיאה', description: 'לא ניתן היה לבטל את השיתוף.', variant: 'destructive'});
    }
  };


  const party1Name = contractData?.formData?.landlordName || contractData?.formData?.serviceProviderName || contractData?.formData?.employerName || "צד א'";
  const party2Name = contractData?.formData?.tenantName || contractData?.formData?.clientName || contractData?.formData?.employeeName || "צד ב'";
  const isOwner = currentUser && contractData && currentUser.uid === contractData.ownerId;


  if (isFirebaseLoading || isPageSpecificLoading) {
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
  
  if (!currentUser && !isFirebaseLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">מפנה לדף התחברות...</p>
      </div>
    );
  }


  if (!contractData) {
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
  
  // Get owner's email if possible (requires fetching user profile, mock for now)
  const ownerDisplayId = contractData.ownerId; // For now display UID, could be an email if we had a lookup

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-4xl mx-auto">
      <header className="text-center border-b pb-6 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground/90">
          {contractData.templateName || 'חוזה'} <span className="text-sm text-muted-foreground">(ID: {contractData.id})</span>
        </h1>
        <p className="text-md text-muted-foreground mt-2">
          נוצר בתאריך: {new Date(contractData.createdAt).toLocaleDateString('he-IL')} | בעלים: {ownerDisplayId}
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

      {isOwner && (
        <Card className="shadow-lg border-accent/30 mt-8">
          <CardHeader className="bg-accent/10">
            <CardTitle className="text-xl font-headline text-accent-foreground/90 flex items-center"><Share2 /> שתף חוזה זה</CardTitle>
            <CardDescription>הזן כתובת אימייל של משתמש כדי לשתף איתו את החוזה (לקריאה בלבד).</CardDescription>
          </CardHeader>
          <form onSubmit={handleShareContract}>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="shareEmail">כתובת אימייל לשיתוף</Label>
                <Input 
                  type="email" 
                  id="shareEmail" 
                  value={shareEmail} 
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1"
                />
              </div>
              {(contractData.sharedWith && contractData.sharedWith.length > 0) && (
                <div>
                  <Label className="text-sm font-medium flex items-center"><Users className="w-4 h-4" /> משותף כעת עם:</Label>
                  <div className="mt-2 space-y-1">
                    {contractData.sharedWith.map(email => (
                      <div key={email} className="flex items-center justify-between p-2 bg-secondary/30 rounded-md">
                        <span className="text-sm text-secondary-foreground">{email}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSharedUser(email)} title={`בטל שיתוף עם ${email}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-6">
              <Button type="submit" variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Share2 /> שתף
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      {!isOwner && contractData.sharedWith && contractData.sharedWith.length > 0 && (
         <Card className="shadow-md border-muted/30 mt-8">
            <CardHeader className="bg-muted/10">
                <CardTitle className="text-lg font-headline text-muted-foreground/90 flex items-center"><Users /> משותף עם</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <ul className="list-disc pl-5 text-muted-foreground">
                    {contractData.sharedWith.map(email => (
                        <li key={email} className="text-sm">{email}</li>
                    ))}
                </ul>
                 {contractData.ownerId && <p className="text-xs mt-2 text-muted-foreground">בעל החוזה (UID): {contractData.ownerId}</p>}
            </CardContent>
         </Card>
      )}


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
