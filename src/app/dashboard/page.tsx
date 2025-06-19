
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchContractsForUser } from '@/firebase/contractServices';
import type { StoredContractData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns'; // For date formatting
import { he } from 'date-fns/locale'; // Hebrew locale for date-fns

export default function DashboardPage() {
    const { currentUser, isFirebaseLoading } = useAuth();
    const router = useRouter();
    const [contracts, setContracts] = useState<StoredContractData[]>([]);
    const [isLoadingContracts, setIsLoadingContracts] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isFirebaseLoading) return;
        if (!currentUser) {
            router.push('/login?redirect=/dashboard');
            return;
        }

        setIsLoadingContracts(true);
        setError(null);
        const unsubscribe = fetchContractsForUser(
            currentUser.uid,
            (fetchedContracts) => {
                setContracts(fetchedContracts);
                setIsLoadingContracts(false);
            },
            (err) => {
                console.error("Error fetching contracts: ", err);
                setError("שגיאה בטעינת החוזים.");
                setIsLoadingContracts(false);
            }
        );

        return () => unsubscribe(); // Cleanup subscription on component unmount
    }, [currentUser, isFirebaseLoading, router]);

    const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case "completed": return "default"; // Using primary color for completed
            case "pending": return "secondary";
            case "draft": return "outline";
            default: return "outline";
        }
    };
    
    const getStatusText = (status?: string): string => {
        switch (status) {
            case "completed": return "הושלם";
            case "pending": return "ממתין לחתימה";
            case "draft": return "טיוטה";
            default: return status || 'לא ידוע';
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            // Firestore Timestamps have a toDate() method
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return format(date, 'd בMMMM yyyy, HH:mm', { locale: he });
        } catch (e) {
            return 'תאריך לא תקין';
        }
    };
    
    if (isFirebaseLoading || (!currentUser && !isFirebaseLoading)) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <section className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground/90">לוח הבקרה שלי</h1>
                <Button onClick={() => router.push('/templates')} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PlusCircle className="ml-2 h-5 w-5" />
                    צור חוזה חדש
                </Button>
            </div>

            <Card className="shadow-xl border-primary/10">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary-foreground/80">החוזים שלי</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingContracts && (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="ml-3 text-muted-foreground">טוען חוזים...</p>
                        </div>
                    )}
                    {error && <p className="text-center text-destructive py-10">{error}</p>}
                    
                    {!isLoadingContracts && !error && contracts.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-xl text-muted-foreground mb-4">עדיין לא יצרת חוזים.</p>
                            <Button onClick={() => router.push('/templates')} variant="outline">
                                <PlusCircle className="ml-2 h-4 w-4" />
                                התחל ביצירת החוזה הראשון שלך
                            </Button>
                        </div>
                    )}

                    {!isLoadingContracts && !error && contracts.length > 0 && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">כותרת</TableHead>
                                        <TableHead className="text-right">סטטוס</TableHead>
                                        <TableHead className="text-right">עדכון אחרון</TableHead>
                                        <TableHead className="text-right hidden sm:table-cell">צדדים</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contracts.map((contract) => (
                                        <TableRow 
                                            key={contract.id} 
                                            onClick={() => router.push(`/contracts/${contract.id}`)}
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell className="font-medium text-primary-foreground/90">{contract.title || 'ללא כותרת'}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(contract.status)} className="text-xs">
                                                    {getStatusText(contract.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{formatDate(contract.lastUpdatedAt)}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                                                {contract.parties?.map(p => p.name).join(', ') || 'לא צוינו'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
