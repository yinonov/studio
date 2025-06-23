
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
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

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

        return () => unsubscribe();
    }, [currentUser, isFirebaseLoading, router]);

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
            case "completed": return "הושלם";
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
    }


    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
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
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">לוח הבקרה שלי</h1>
                <Button onClick={() => router.push('/templates')} size="lg">
                    <PlusCircle className="ml-2 h-5 w-5" />
                    צור חוזה חדש
                </Button>
            </div>

            <Card className="rounded-2xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900">החוזים שלי</CardTitle>
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
                                        <TableHead className="text-right text-gray-600 font-semibold">כותרת</TableHead>
                                        <TableHead className="text-right text-gray-600 font-semibold">סטטוס</TableHead>
                                        <TableHead className="text-right text-gray-600 font-semibold">עדכון אחרון</TableHead>
                                        <TableHead className="text-right hidden sm:table-cell text-gray-600 font-semibold">צדדים</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contracts.map((contract) => (
                                        <TableRow 
                                            key={contract.id} 
                                            onClick={() => router.push(`/contracts/${contract.id}`)}
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell className="font-medium text-gray-900">{contract.title || 'ללא כותרת'}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(contract.status)} className={`text-xs ${getStatusTextClass(contract.status)}`}>
                                                    {getStatusText(contract.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-600 text-sm">{formatDate(contract.lastUpdatedAt)}</TableCell>
                                            <TableCell className="text-gray-600 text-sm hidden sm:table-cell">
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
