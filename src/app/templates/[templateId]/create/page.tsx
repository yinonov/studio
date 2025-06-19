
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTemplateById } from '@/firebase/templateServices';
import { createDraftContract, updateContractData } from '@/firebase/contractServices';
import type { Template, StoredContractData } from '@/types';
import FormInput from '@/components/shared/FormInput';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress"
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return function executedFunction(...args: Parameters<F>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

const STEPS_CONFIG = [
    { name: 'צדדים', fields: ['party1Name', 'party1Email', 'party2Name', 'party2Email'] },
    { name: 'תנאים עיקריים', fields: ['address', 'rentAmount', 'startDate'] },
    { name: 'סקירה ושליחה', fields: [] }
];

export default function ContractCreationPage() {
    const { currentUser, isFirebaseLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const templateId = typeof params.templateId === 'string' ? params.templateId : null;
    const { toast } = useToast();

    const [template, setTemplate] = useState<Template | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [contractId, setContractId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [signingUrl, setSigningUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    
    const debouncedSaveContract = useCallback(
        debounce(async (cid: string | null, data: Record<string, string>) => {
            if (!cid || Object.keys(data).length === 0) return;
            setIsSaving(true);
            try {
                const parties = [
                    { name: data.party1Name || '', email: data.party1Email || ''},
                    { name: data.party2Name || '', email: data.party2Email || ''}
                ].filter(p => p.name && p.email);
                await updateContractData(cid, { formData: data, parties });
            } catch (err) {
                console.error("Error auto-saving draft:", err);
                toast({ title: "שגיאה בשמירת טיוטה", variant: "destructive" });
            } finally {
                setIsSaving(false);
            }
        }, 1500), 
    []);

    useEffect(() => {
        if (isFirebaseLoading) return;
        if (!currentUser) {
            router.push(`/login?redirect=/templates/${templateId}/create`);
            return;
        }
        if (!templateId) {
            toast({ title: "שגיאה", description: "מזהה תבנית חסר.", variant: "destructive" });
            router.push('/templates');
            return;
        }

        const loadTemplateAndDraft = async () => {
            setIsPageLoading(true);
            try {
                const fetchedTemplate = await fetchTemplateById(templateId);
                if (!fetchedTemplate) {
                    toast({ title: "שגיאה", description: "תבנית לא נמצאה.", variant: "destructive" });
                    router.push('/templates');
                    return;
                }
                setTemplate(fetchedTemplate);
                
                const newContractId = await createDraftContract(currentUser.uid, { id: fetchedTemplate.id, title: fetchedTemplate.title });
                if (newContractId) {
                    setContractId(newContractId);
                    const initialData: Record<string, string> = {};
                    setFormData(initialData); 
                } else {
                    throw new Error("Failed to create draft contract.");
                }
            } catch (err: any) {
                setError("שגיאה בטעינת תבנית או יצירת טיוטה.");
                toast({ title: "שגיאה", description: err.message || "לא ניתן היה לטעון את הדף.", variant: "destructive"});
                console.error(err);
            } finally {
                setIsPageLoading(false);
            }
        };
        loadTemplateAndDraft();
    }, [currentUser, isFirebaseLoading, router, templateId, toast]);

    useEffect(() => {
        if (contractId && Object.keys(formData).length > 0) {
            debouncedSaveContract(contractId, formData);
        }
    }, [formData, contractId, debouncedSaveContract]);

    const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const nextStep = () => {
        if (currentStep < STEPS_CONFIG.length) {
            const currentStepFields = STEPS_CONFIG[currentStep - 1].fields;
            const missingRequired = template?.fields?.filter(f =>
                f.required && currentStepFields.includes(f.id) && !formData[f.id]
            );
            if (missingRequired && missingRequired.length > 0) {
                toast({ title: "שדות חובה חסרים", description: `אנא מלא: ${missingRequired.map(f=>f.label).join(', ')}`, variant: "destructive"});
                return;
            }
            setCurrentStep(currentStep + 1);
        }
    };
    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSendForSignature = async () => {
        if (!contractId) {
            toast({ title: "שגיאה", description: "מזהה חוזה לא קיים.", variant: "destructive" });
            return;
        }
        setIsSaving(true); setError('');
        try {
            await updateContractData(contractId, { formData, status: 'pending' }); 

            const initiateSigningSession = httpsCallable(functions, 'initiateSigningSession');
            const result: any = await initiateSigningSession({ contractId });
            if (result.data.signingUrl) {
                setSigningUrl(result.data.signingUrl);
                toast({ title: "החוזה נשלח לחתימה!", description: "יוטען ממשק החתימה."});
            } else {
                throw new Error(result.data.error || "לא התקבלה כתובת URL לחתימה.");
            }
        } catch (err: any) {
            setError("התנעת תהליך החתימה נכשלה.");
            toast({ title: "שגיאה בשליחה לחתימה", description: err.message, variant: "destructive"});
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const renderStepContent = () => {
        if (!template) return <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />;
        switch(currentStep) {
            case 1: return (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">צד א' (לדוגמה: משכיר/נותן שירות)</h3>
                    <FormInput label="שם מלא" name="party1Name" value={formData.party1Name || ''} onChange={handleDataChange} placeholder="ישראל ישראלי" />
                    <FormInput label="אימייל" name="party1Email" type="email" value={formData.party1Email || ''} onChange={handleDataChange} placeholder="israel@example.com" />
                    
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2 pt-4">צד ב' (לדוגמה: שוכר/לקוח)</h3>
                    <FormInput label="שם מלא" name="party2Name" value={formData.party2Name || ''} onChange={handleDataChange} placeholder="משה לוי" />
                    <FormInput label="אימייל" name="party2Email" type="email" value={formData.party2Email || ''} onChange={handleDataChange} placeholder="moshe@example.com" />
                </div>
            );
            case 2: return (
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">תנאים עיקריים (דוגמה)</h3>
                    <FormInput label="כתובת הנכס" name="address" value={formData.address || ''} onChange={handleDataChange} placeholder="הרצל 10, תל אביב" />
                    <FormInput label="שכר דירה חודשי (₪)" name="rentAmount" type="number" value={formData.rentAmount || ''} onChange={handleDataChange} placeholder="5000" />
                    <FormInput label="תאריך התחלה" name="startDate" type="date" value={formData.startDate || ''} onChange={handleDataChange} />
                    <FormInput label="הערות נוספות" name="additionalNotes" type="textarea" value={formData.additionalNotes || ''} onChange={handleDataChange} placeholder="פרטים נוספים או סעיפים מיוחדים..." required={false} />
                </div>
            );
            case 3: return (
                <div className="text-center space-y-6">
                    <h3 className="text-2xl font-bold text-gray-900">סקירה ושליחה לחתימה</h3>
                    <p className="text-gray-600">
                        אנא בדוק/י את כל הפרטים שהזנת. לחיצה על הכפתור תכין את החוזה ותשלח אותו לחתימת הצדדים.
                    </p>
                    <Button onClick={handleSendForSignature} size="lg" variant="accent" className="font-semibold" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin ml-2" /> : <ShieldCheck className="ml-2 h-5 w-5" />}
                        {isSaving ? 'מעבד ושולח...' : 'שלח חוזה לחתימה'}
                    </Button>
                    {error && <p className="text-destructive text-sm mt-4">{error}</p>}
                </div>
            );
            default: return null;
        }
    };

    if (isPageLoading || !currentUser) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">טוען...</p>
            </div>
        );
    }
    
    if (signingUrl) {
        return (
            <Card className="rounded-2xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-gray-900">ממשק חתימה</CardTitle>
                </CardHeader>
                <CardContent>
                    <iframe 
                        src={signingUrl} 
                        title="חתימת חוזה" 
                        className="w-full h-[70vh] sm:h-[80vh] border-0 rounded-md shadow-inner"
                        allow="camera;microphone"
                    ></iframe>
                     <Button onClick={() => router.push(`/contracts/${contractId}`)} variant="link" className="mt-4">
                        חזור לפרטי החוזה
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    if (!template) {
        return (
            <div className="text-center py-10">
                <p className="text-xl text-destructive">שגיאה: לא ניתן היה לטעון את תבנית החוזה.</p>
                <Button onClick={() => router.push('/templates')} variant="outline" className="mt-4">חזור למאגר התבניות</Button>
            </div>
        );
    }
    
    const progressPercentage = (currentStep / STEPS_CONFIG.length) * 100;

    return (
        <section className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">יצירת: {template.title}</h1>
                <p className="mt-2 text-md text-gray-600">מלא/י את הפרטים הבאים ליצירת החוזה. הטיוטה נשמרת אוטומטית.</p>
            </div>

            <Progress value={progressPercentage} className="w-full h-2 mb-8 rounded-full" />
            
            <div className="max-w-5xl mx-auto flex flex-col lg:flex-row-reverse gap-8">
                <div className="w-full lg:w-1/4 lg:sticky lg:top-24 self-start">
                    <Card className="shadow-md rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-gray-900">שלבי יצירה</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {STEPS_CONFIG.map((s, index) => (
                                    <li key={index} 
                                        className={`flex items-center p-3 rounded-lg transition-all cursor-default
                                            ${currentStep === index + 1 ? 'bg-primary/10 text-primary font-semibold border-r-4 border-primary' : 
                                            (currentStep > index + 1 ? 'text-accent' : 'text-gray-600 hover:bg-muted/50')}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ml-3 flex-shrink-0 text-xs
                                            ${currentStep === index + 1 ? 'bg-primary text-primary-foreground' : 
                                            (currentStep > index + 1 ? 'bg-accent text-accent-foreground' : 'bg-secondary border')}`}>
                                            {currentStep > index + 1 ? '✔' : index + 1}
                                        </div>
                                        {s.name}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-full lg:w-3/4">
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl text-gray-900">{STEPS_CONFIG[currentStep-1].name}</CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[300px]">
                            {renderStepContent()}
                        </CardContent>
                        <CardContent className="flex justify-between items-center mt-6 pt-6 border-t">
                            <Button 
                                onClick={nextStep} 
                                className="font-semibold" 
                                disabled={currentStep >= STEPS_CONFIG.length || isSaving}
                            >
                                {currentStep === STEPS_CONFIG.length -1 ? "סקירה ושליחה" : "הבא"}
                                <ChevronLeft className="mr-2 w-5 h-5" />
                            </Button>
                            <Button 
                                onClick={prevStep} 
                                variant="secondary"
                                className="font-semibold"
                                disabled={currentStep === 1 || isSaving}
                            >
                                <ChevronRight className="ml-2 w-5 h-5" />
                                הקודם
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {isSaving && <p className="text-xs text-muted-foreground text-center mt-2">שומר טיוטה...</p>}
        </section>
    );
}
