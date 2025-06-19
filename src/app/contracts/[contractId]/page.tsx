
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchContractById, updateContractData } from '@/firebase/contractServices';
import type { StoredContractData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Share2, FileText, CheckCircle, User, ChevronRight, Edit, Trash2, Copy, Phone, Mail, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { fetchTemplateById, type Template } from '@/firebase/templateServices';


interface AuditLogItem {
  action: string;
  user: string;
  date: string;
  icon: React.ReactElement;
}

// generateStaticParams MUST NOT be here as this is a Client Component

function interpolateWithDefaults(text: string, data: Record<string, string>): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/\{\{(.+?)\}\}/g, (_match, captured) => {
    const parts = captured.split('||');
    const fieldName = parts[0].trim();
    const defaultValue = parts.length > 1 ? parts[1].trim() : `[${fieldName}]`;
    
    const valueFromData = data[fieldName];

    if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
      return String(valueFromData);
    }
    return defaultValue;
  });
}


export default function ContractViewPage() {
    const { currentUser, isFirebaseLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const contractId = typeof params.contractId === 'string' ? params.contractId : null;
    const { toast } = useToast();

    const [contract, setContract] = useState<StoredContractData | null>(null);
    const [template, setTemplate] = useState<Template | null>(null);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareIdentifier, setShareIdentifier] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // General processing state

    const isOwner = contract && currentUser && contract.ownerId === currentUser.uid;

    const hasAccess = () => {
        if (!currentUser || !contract) return false;
        if (contract.ownerId === currentUser.uid) return true;
        if (contract.sharedWith?.some(identifier => 
            (currentUser.email && identifier.toLowerCase() === currentUser.email.toLowerCase()) || 
            (currentUser.phoneNumber && identifier === currentUser.phoneNumber)
        )) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (isFirebaseLoading) return;
        if (!currentUser) {
            router.push(`/login?redirect=/contracts/${contractId}`);
            return;
        }
        if (!contractId) {
            setError("מזהה חוזה חסר.");
            setIsLoadingContract(false);
            return;
        }

        const loadContract = async () => {
            setIsLoadingContract(true);
            setError(null);
            try {
                const fetchedContract = await fetchContractById(contractId);
                if (!fetchedContract) {
                    setError("החוזה לא נמצא.");
                    setContract(null);
                } else {
                    setContract(fetchedContract);
                    if (fetchedContract.templateId) {
                        const fetchedTemplate = await fetchTemplateById(fetchedContract.templateId);
                        setTemplate(fetchedTemplate);
                    }
                }
            } catch (err: any) {
                console.error("Error fetching contract:", err);
                setError("שגיאה בטעינת החוזה.");
            } finally {
                setIsLoadingContract(false);
            }
        };
        loadContract();
    }, [currentUser, isFirebaseLoading, router, contractId]);

    useEffect(() => {
        if (contract && currentUser && !isLoadingContract && !hasAccess()) {
            setError("אין לך הרשאה לצפות בחוזה זה.");
        }
    }, [contract, currentUser, isLoadingContract]);


    const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" | "accent" => {
        switch (status) {
            case "completed": return "accent";
            case "pending": return "outline";
            case "draft": return "secondary";
            default: return "secondary";
        }
    };
    
    const getStatusText = (status?: string): string => {
        switch (status) {
            case "completed": return "הושלם ונחתם";
            case "pending": return "ממתין לחתימה";
            case "draft": return "טיוטה";
            default: return status || 'לא ידוע';
        }
    };

   const getStatusTextClass = (status?: string): string => {
       switch (status) {
           case "pending": return "text-yellow-800"; 
           default: return "";
       }
   };


    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'd בMMMM yyyy, HH:mm', { locale: he });
        } catch (e) {
            return 'תאריך לא תקין';
        }
    };

    const handleShareContract = async () => {
        if (!contract || !shareIdentifier.trim() || !isOwner) return;

        const normalizedIdentifier = shareIdentifier.trim().toLowerCase();
        if ((currentUser?.email && normalizedIdentifier === currentUser.email.toLowerCase()) || 
            (currentUser?.phoneNumber && normalizedIdentifier === currentUser.phoneNumber)) {
            toast({ title: "שגיאה", description: "לא ניתן לשתף חוזה עם עצמך.", variant: "destructive" });
            return;
        }
        
        setIsProcessing(true);
        try {
            const currentSharedWith = contract.sharedWith?.map(s => s.toLowerCase()) || [];
            if (currentSharedWith.includes(normalizedIdentifier)) {
                toast({ title: "מידע", description: "החוזה כבר משותף עם משתמש זה.", variant: "default" });
                setShareIdentifier('');
                setIsProcessing(false);
                return;
            }
            const updatedSharedWith = [...(contract.sharedWith || []), shareIdentifier.trim()]; 
            await updateContractData(contract.id, { sharedWith: updatedSharedWith });
            setContract(prev => prev ? { ...prev, sharedWith: updatedSharedWith } : null);
            toast({ title: "הצלחה", description: `החוזה שותף עם ${shareIdentifier.trim()}.` });
            setShareIdentifier('');
        } catch (err) {
            console.error("Error sharing contract:", err);
            toast({ title: "שגיאה", description: "שיתוף החוזה נכשל.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveShare = async (identifierToRemove: string) => {
        if (!contract || !isOwner) return;
        setIsProcessing(true);
        try {
            const updatedSharedWith = contract.sharedWith?.filter(u => u.toLowerCase() !== identifierToRemove.toLowerCase()) || [];
            await updateContractData(contract.id, { sharedWith: updatedSharedWith });
            setContract(prev => prev ? { ...prev, sharedWith: updatedSharedWith } : null);
            toast({ title: "הצלחה", description: `השיתוף עם ${identifierToRemove} הוסר.`});
        } catch (err) {
            console.error("Error removing share:", err);
            toast({ title: "שגיאה", description: "הסרת השיתוף נכשלה.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href)
                .then(() => toast({ title: "הצלחה", description: "קישור לחוזה הועתק ללוח." }))
                .catch(() => toast({ title: "שגיאה", description: "לא ניתן היה להעתיק את הקישור.", variant: "destructive" }));
        }
    };

    const handleSendForSignature = async () => {
        if (!contractId || !isOwner || (contract.status !== 'draft' && contract.status !== 'pending')) return;
        setIsProcessing(true);
        setError('');
        try {
            if (contract.status === 'draft') {
                await updateContractData(contractId, { status: 'pending' });
                setContract(prev => prev ? { ...prev, status: 'pending' } : null);
            }
            
            const initiateSigningSessionFn = httpsCallable(functions, 'initiateSigningSession');
            const result: any = await initiateSigningSessionFn({ contractId });
            
            if (result.data.signingUrl) {
                await updateContractData(contractId, { signingUrl: result.data.signingUrl, status: 'pending' });
                setContract(prev => prev ? { ...prev, signingUrl: result.data.signingUrl, status: 'pending' } : null);
                toast({ title: "מוכן לחתימה!", description: "ממשק החתימה יטען כעת."});
            } else {
                throw new Error(result.data.error || "לא התקבלה כתובת URL לחתימה מהשרת.");
            }
        } catch (err: any) {
            setError("התנעת תהליך החתימה נכשלה. ודא שפונקציית השרת `initiateSigningSession` פרוסה ועובדת כראוי.");
            toast({ title: "שגיאה בשליחה לחתימה", description: err.message, variant: "destructive"});
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };


    if (isLoadingContract || isFirebaseLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">טוען פרטי חוזה...</p>
            </div>
        );
    }

    if (error && !contract) { 
        return (
            <div className="text-center py-10">
                <p className="text-xl text-destructive mb-4">{error}</p>
                <Button onClick={() => router.push('/dashboard')} variant="outline">חזרה ללוח הבקרה</Button>
            </div>
        );
    }
    
    if (!contract || !currentUser || !hasAccess()) { 
        return (
             <div className="text-center py-10">
                <p className="text-xl text-muted-foreground">החוזה לא נמצא או שאין לך הרשאה לצפות בו.</p>
                 <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">חזרה ללוח הבקרה</Button>
            </div>
        );
    }
    
    const auditLog: AuditLogItem[] = [
        { action: "חוזה נוצר", user: contract.ownerId === currentUser.uid ? "את/ה" : "הבעלים", date: formatDate(contract.createdAt), icon: <FileText className="text-primary" /> },
        (contract.status === 'pending' || contract.status === 'completed') && contract.signingUrl && { action: "נשלח לחתימה", user: contract.ownerId === currentUser.uid ? "את/ה" : "הבעלים", date: formatDate(contract.lastUpdatedAt), icon: <Send className="text-blue-500" /> },
        contract.status === 'completed' && { action: "החוזה נחתם", user: "כל הצדדים", date: formatDate(contract.lastUpdatedAt), icon: <CheckCircle className="text-accent" /> }
    ].filter(Boolean) as AuditLogItem[];


    return (
        <section className="space-y-8">
            <Button onClick={() => router.push('/dashboard')} variant="ghost" className="flex items-center text-gray-600 hover:text-accent-foreground font-semibold mb-2 sm:mb-4">
                <ChevronRight className="w-5 h-5 ml-1" />
                חזרה ללוח הבקרה
            </Button>

            <Card className="rounded-2xl shadow-lg overflow-hidden">
                <CardHeader className="bg-card border-b p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-right sm:text-right">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{contract.title || 'חוזה ללא כותרת'}</h1>
                            <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground">
                                נוצר ב: {formatDate(contract.createdAt)} | עדכון אחרון: {formatDate(contract.lastUpdatedAt)}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                             <Badge variant={getStatusVariant(contract.status)} className={`text-sm px-3 py-1 self-start sm:self-auto ${getStatusTextClass(contract.status)}`}>
                                {getStatusText(contract.status)}
                            </Badge>
                            <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap justify-start sm:justify-end">
                                <Button variant="secondary" size="sm" disabled>
                                    <Download className="ml-2 h-4 w-4"/>הורד PDF (בקרוב)
                                </Button>
                                {isOwner && contract.status === 'draft' && (
                                   <Button variant="outline" size="sm" onClick={() => router.push(`/templates/${contract.templateId}/create?contractId=${contract.id}`)}>
                                       <Edit className="ml-2 h-4 w-4"/>ערוך טיוטה
                                   </Button>
                                )}
                                 {isOwner && (contract.status === 'draft' || (contract.status === 'pending' && !contract.signingUrl)) && (
                                    <Button 
                                        variant="default" 
                                        size="sm" 
                                        onClick={handleSendForSignature}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <Send className="ml-2 h-4 w-4"/>}
                                        {contract.status === 'draft' ? 'שלח לחתימה' : 'הכן מחדש לחתימה'}
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                                    <Copy className="ml-2 h-4 w-4"/>העתק קישור
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {error && <p className="text-destructive mb-4">{error}</p>}
                        {contract.status === 'pending' && contract.signingUrl ? (
                             <div className="mt-0">
                                <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">ממשק חתימה</h3>
                                <iframe 
                                    src={contract.signingUrl} 
                                    title="חתימת חוזה" 
                                    className="w-full h-[60vh] sm:h-[70vh] border rounded-lg shadow-inner"
                                    allow="camera;microphone" 
                                ></iframe>
                             </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">תצוגה מקדימה של המסמך</h3>
                                <ScrollArea className="h-[500px] md:h-[600px] border rounded-lg bg-muted/50 p-4 shadow-inner">
                                    <div className="prose prose-sm max-w-none text-right leading-relaxed text-foreground/80">
                                        <h4 className="text-center font-bold text-lg mb-4 text-foreground">{contract.title}</h4>
                                        {template?.baseClauses && template.baseClauses.length > 0 ? (
                                          template.baseClauses.map((clause, index) => (
                                            <p 
                                              key={index} 
                                              className="mb-3" 
                                              dangerouslySetInnerHTML={{ __html: interpolateWithDefaults(clause, contract.formData || {}).replace(/\n/g, '<br />') }} 
                                            />
                                          ))
                                        ) : (
                                           Object.entries(contract.formData || {}).map(([key, value]) => {
                                                if (key.startsWith('party') || !value) return null;
                                                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                                return <p key={key}><strong>{label}:</strong> {String(value)}</p>;
                                            }) 
                                        )}
                                        
                                        {contract.customClauses && contract.customClauses.length > 0 && (
                                            <>
                                                <h5 className="font-semibold mt-4 text-foreground">סעיפים מותאמים אישית:</h5>
                                                {contract.customClauses.map((clause, idx) => (
                                                    <p key={idx} className="text-xs mt-1 whitespace-pre-wrap">{clause.legalWording}</p>
                                                ))}
                                            </>
                                        )}
                                        {(!template?.baseClauses || template.baseClauses.length === 0) && Object.keys(contract.formData || {}).length === 0 && (
                                           <p className="text-center text-muted-foreground mt-6">[ אין תוכן להצגה בחוזה זה ]</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </>
                        )}
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-2xl shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center justify-between text-foreground">
                                    <span>צדדים בחוזה</span> <User className="w-5 h-5 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {contract.parties && contract.parties.length > 0 ? contract.parties.map((party, i) => (
                                        <li key={i} className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                                            <span className="font-medium text-foreground">{party.name}</span>
                                            <span className="text-xs">{party.email}</span>
                                        </li>
                                    )) : <li className="text-gray-500">לא צוינו צדדים.</li>}
                                </ul>
                            </CardContent>
                        </Card>
                        
                        <Card className="rounded-2xl shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center justify-between text-foreground">
                                    <span>היסטוריית פעילות</span> <FileText className="w-5 h-5 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {auditLog.map((log, index) => (
                                        <li key={index} className="flex items-start flex-row-reverse gap-3 text-sm">
                                            <div className="bg-muted p-2 rounded-full mt-0.5">{log.icon}</div>
                                            <div className="text-right">
                                                <p className="font-medium text-foreground">{log.action}</p>
                                                <p className="text-xs text-muted-foreground">על ידי {log.user} ב-{log.date}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {isOwner && (
                            <Card className="rounded-2xl shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold flex items-center justify-between text-foreground">
                                        <span>שיתוף החוזה</span> <Share2 className="w-5 h-5 text-muted-foreground" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="share-identifier" className="text-foreground/80">שתף עם (אימייל או טלפון):</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                id="share-identifier" 
                                                type="text"
                                                value={shareIdentifier}
                                                onChange={(e) => setShareIdentifier(e.target.value)}
                                                placeholder="you@example.com או 05X-XXX-XXXX"
                                                className="flex-grow"
                                                disabled={isProcessing}
                                            />
                                            <Button onClick={handleShareContract} disabled={isProcessing || !shareIdentifier.trim()} variant="secondary">
                                                {isProcessing ? <Loader2 className="animate-spin"/> : <Share2 />}
                                                שתף
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground/80 mb-2">משותף עם:</h4>
                                        {(!contract.sharedWith || contract.sharedWith.length === 0) && <p className="text-xs text-muted-foreground">החוזה אינו משותף עם משתמשים אחרים עדיין.</p>}
                                        <ul className="space-y-1 text-sm">
                                            {contract.sharedWith?.map(identifier => (
                                                <li key={identifier} className="flex items-center justify-between p-1.5 bg-muted/30 rounded-md">
                                                    <span className="text-muted-foreground flex items-center">
                                                        {identifier.includes('@') ? <Mail className="w-3 h-3 ml-2 text-gray-500"/> : <Phone className="w-3 h-3 ml-2 text-gray-500"/>}
                                                        {identifier}
                                                    </span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveShare(identifier)} disabled={isProcessing}>
                                                        <Trash2 className="w-3 h-3 text-destructive"/>
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

    