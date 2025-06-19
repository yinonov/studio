
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchContractById } from '@/firebase/contractServices';
import type { StoredContractData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Download, Share2, FileText, CheckCircle, User, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define AuditLogItem type locally or import if defined elsewhere
interface AuditLogItem {
  action: string;
  user: string;
  date: string;
  icon: React.ReactElement;
}


export default function ContractViewPage() {
    const { currentUser, isFirebaseLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const contractId = typeof params.contractId === 'string' ? params.contractId : null;

    const [contract, setContract] = useState<StoredContractData | null>(null);
    const [isLoadingContract, setIsLoadingContract] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    setError("החוזה לא נמצא או שאין לך גישה אליו.");
                } else {
                    // Basic authorization: check if current user is owner or sharedWith (if implemented)
                    // For now, assuming if fetched, user has access (owner in this basic model)
                    if (fetchedContract.ownerId !== currentUser.uid /* && !fetchedContract.sharedWith?.includes(currentUser.email) */) {
                       // setError("אין לך הרשאה לצפות בחוזה זה.");
                       // setContract(null); // Clear contract if not authorized
                       // router.push('/dashboard'); // Or a specific access denied page
                       // return;
                    }
                    setContract(fetchedContract);
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

    const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case "completed": return "default";
            case "pending": return "secondary";
            case "draft": return "outline";
            default: return "outline";
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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'd בMMMM yyyy, HH:mm', { locale: he });
        } catch (e) {
            return 'תאריך לא תקין';
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

    if (error) {
        return (
            <div className="text-center py-10">
                <p className="text-xl text-destructive mb-4">{error}</p>
                <Button onClick={() => router.push('/dashboard')} variant="outline">חזרה ללוח הבקרה</Button>
            </div>
        );
    }

    if (!contract) { // Should be caught by error state, but as a fallback
        return (
             <div className="text-center py-10">
                <p className="text-xl text-muted-foreground">החוזה לא נמצא.</p>
                 <Button onClick={() => router.push('/dashboard')} variant="outline" className="mt-4">חזרה ללוח הבקרה</Button>
            </div>
        );
    }
    
    const auditLog: AuditLogItem[] = [
        { action: "חוזה נוצר", user: "את/ה", date: formatDate(contract.createdAt), icon: <FileText className="text-primary" /> },
        (contract.status === 'pending' || contract.status === 'completed') && { action: "נשלח לחתימה", user: "את/ה", date: formatDate(contract.lastUpdatedAt), icon: <Share2 className="text-muted-foreground" /> },
        contract.status === 'completed' && { action: "החוזה נחתם", user: "כל הצדדים", date: formatDate(contract.lastUpdatedAt), icon: <CheckCircle className="text-green-500" /> }
    ].filter(Boolean) as AuditLogItem[];


    return (
        <section className="space-y-8">
            <Button onClick={() => router.push('/dashboard')} variant="ghost" className="flex items-center text-primary hover:text-primary/80 font-semibold mb-2 sm:mb-4">
                <ChevronRight className="w-5 h-5 ml-1" />
                חזרה ללוח הבקרה
            </Button>

            <Card className="shadow-xl border-primary/10 overflow-hidden">
                <CardHeader className="bg-card border-b p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-right sm:text-right">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground/90">{contract.title || 'חוזה ללא כותרת'}</h1>
                            <CardDescription className="mt-1 text-xs sm:text-sm">
                                נוצר ב: {formatDate(contract.createdAt)} | עדכון אחרון: {formatDate(contract.lastUpdatedAt)}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                             <Badge variant={getStatusVariant(contract.status)} className="text-sm px-3 py-1 self-start sm:self-auto">
                                {getStatusText(contract.status)}
                            </Badge>
                            <div className="flex gap-2 mt-2 sm:mt-0">
                                <Button variant="outline" size="sm" disabled>
                                    <Download className="ml-2 h-4 w-4"/>הורד PDF (בקרוב)
                                </Button>
                                {contract.status === 'draft' && contract.ownerId === currentUser?.uid && (
                                   <Button variant="outline" size="sm" onClick={() => router.push(`/templates/${contract.templateId}/create?contractId=${contract.id}`)}>
                                       <Edit className="ml-2 h-4 w-4"/>ערוך טיוטה
                                   </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <h3 className="text-xl font-semibold text-primary-foreground/80 mb-3 border-b pb-2">תצוגה מקדימה של המסמך</h3>
                        <ScrollArea className="h-[500px] md:h-[600px] border rounded-md bg-muted/20 p-4 shadow-inner">
                            <div className="prose prose-sm max-w-none text-right leading-relaxed">
                                <h4 className="text-center font-bold text-lg mb-4">{contract.title}</h4>
                                <p><strong>תאריך:</strong> {formatDate(contract.createdAt)}</p>
                                <hr className="my-3"/>
                                {contract.formData?.party1Name && <p><strong>צד א':</strong> {contract.formData.party1Name} ({contract.formData.party1Email || 'אין אימייל'})</p>}
                                {contract.formData?.party2Name && <p><strong>צד ב':</strong> {contract.formData.party2Name} ({contract.formData.party2Email || 'אין אימייל'})</p>}
                                <hr className="my-3"/>
                                {Object.entries(contract.formData || {}).map(([key, value]) => {
                                    if (key.startsWith('party') || !value) return null; // Already displayed or empty
                                    // Simple display for other form data - can be enhanced
                                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Basic formatting
                                    return <p key={key}><strong>{label}:</strong> {String(value)}</p>;
                                })}
                                <br />
                                <p className="text-center text-muted-foreground mt-6">[... שאר הטקסט המשפטי של החוזה יוצג כאן ...]</p>
                                {contract.customClauses && contract.customClauses.length > 0 && (
                                    <>
                                        <h5 className="font-semibold mt-4">סעיפים מותאמים אישית:</h5>
                                        {contract.customClauses.map((clause, idx) => (
                                            <p key={idx} className="text-xs mt-1 whitespace-pre-wrap">{clause.legalWording}</p>
                                        ))}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                         {contract.signingUrl && contract.status === 'pending' && (
                             <div className="mt-6">
                                <h3 className="text-lg font-semibold text-primary-foreground/80 mb-2">ממשק חתימה</h3>
                                <iframe 
                                    src={contract.signingUrl} 
                                    title="חתימת חוזה" 
                                    className="w-full h-[60vh] border rounded-md shadow-inner"
                                ></iframe>
                             </div>
                         )}
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                    <span>צדדים בחוזה</span> <User className="w-5 h-5 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {contract.parties && contract.parties.length > 0 ? contract.parties.map((party, i) => (
                                        <li key={i} className="flex justify-between items-center p-2 bg-muted/30 rounded-md">
                                            <span className="font-medium text-foreground/80">{party.name}</span>
                                            <span className="text-xs">{party.email}</span>
                                        </li>
                                    )) : <li>לא צוינו צדדים.</li>}
                                </ul>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center justify-between">
                                    <span>היסטוריית פעילות</span> <FileText className="w-5 h-5 text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {auditLog.map((log, index) => (
                                        <li key={index} className="flex items-start flex-row-reverse gap-3 text-sm">
                                            <div className="bg-muted p-2 rounded-full mt-0.5 text-primary">{log.icon}</div>
                                            <div className="text-right">
                                                <p className="font-medium text-foreground/80">{log.action}</p>
                                                <p className="text-xs text-muted-foreground">על ידי {log.user} ב-{log.date}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                         {/* Add sharing section if needed here, similar to Chetz Contracts implementation */}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}

