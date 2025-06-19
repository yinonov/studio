
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTemplateById } from '@/firebase/templateServices';
import { createDraftContract, updateContractData } from '@/firebase/contractServices';
import type { Template, StoredContractData } from '@/types';
import FormInput from '@/components/shared/FormInput';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress"
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import ContractLivePreview from '@/components/contract/ContractLivePreview';

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
                
                const contractTitle = data.contractTitle || template?.title || 'חוזה ללא כותרת';

                await updateContractData(cid, { 
                    formData: data, 
                    parties,
                    title: contractTitle
                });
            } catch (err) {
                console.error("Error auto-saving draft:", err);
                toast({ title: "שגיאה בשמירת טיוטה", variant: "destructive" });
            } finally {
                setIsSaving(false);
            }
        }, 1500), 
    [template?.title, toast]);

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
                
                const queryParams = new URLSearchParams(window.location.search);
                const existingContractId = queryParams.get('contractId');

                if (existingContractId) {
                    setContractId(existingContractId);
                     toast({title:"טיוטה נטענה", description: "ממשיך עריכת טיוטה קיימת."});

                } else {
                    const newContractId = await createDraftContract(currentUser.uid, { id: fetchedTemplate.id, title: fetchedTemplate.title });
                    if (newContractId) {
                        setContractId(newContractId);
                    } else {
                        throw new Error("Failed to create draft contract.");
                    }
                }
                const initialData: Record<string, string> = {};
                (fetchedTemplate.fields || []).forEach(field => {
                     if (field.id === 'contractTitle') initialData[field.id] = fetchedTemplate.title; 
                });
                 if (!initialData.contractTitle && fetchedTemplate.title) {
                    initialData.contractTitle = fetchedTemplate.title;
                }
                setFormData(initialData);

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
            const currentStepConfig = STEPS_CONFIG[currentStep - 1];
            const missingRequired = template?.fields?.filter(f =>
                f.required && currentStepConfig.fields.includes(f.id) && (!formData[f.id] || String(formData[f.id]).trim() === '')
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
             const contractTitle = formData.contractTitle || template?.title || 'חוזה ללא כותרת';
            await updateContractData(contractId, { formData, status: 'pending', title: contractTitle }); 

            const initiateSigningSession = httpsCallable(functions, 'initiateSigningSession');
            const result: any = await initiateSigningSession({ contractId });
            if (result.data.signingUrl) {
                setSigningUrl(result.data.signingUrl);
                 await updateContractData(contractId, { signingUrl: result.data.signingUrl });
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
        
        const currentStepConfig = STEPS_CONFIG[currentStep - 1];
        
        if (currentStep === STEPS_CONFIG.length) { // Review and Send step
             return (
                <div className="text-center space-y-6">
                    <h3 className="text-2xl font-bold">סקירה ושליחה לחתימה</h3>
                    <p className="text-muted-foreground">
                        אנא בדוק/י את כל הפרטים שהזנת בתצוגה המקדימה. לחיצה על הכפתור תכין את החוזה ותשלח אותו לחתימת הצדדים.
                    </p>
                    <Button onClick={handleSendForSignature} size="lg" variant="accent" className="font-semibold" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin ml-2" /> : <ShieldCheck className="ml-2 h-5 w-5" />}
                        {isSaving ? 'מעבד ושולח...' : 'שלח חוזה לחתימה'}
                    </Button>
                    {error && <p className="text-destructive text-sm mt-4">{error}</p>}
                </div>
            );
        }

        const fieldsForCurrentStep = template.fields?.filter(field => currentStepConfig.fields.includes(field.id)) || [];

        return (
            <div className="space-y-6">
                {currentStep === 1 && (
                    <>
                        <FormInput label="כותרת החוזה (פנימי)" name="contractTitle" value={formData.contractTitle || template.title || ''} onChange={handleDataChange} placeholder="לדוגמה: הסכם שכירות הרצל 1" required={true}/>
                        <h3 className="text-xl font-bold border-b pb-2 pt-4">צד א' (לדוגמה: משכיר/נותן שירות)</h3>
                        <FormInput label="שם מלא" name="party1Name" value={formData.party1Name || ''} onChange={handleDataChange} placeholder="ישראל ישראלי" required={template.fields?.find(f=>f.id === 'party1Name')?.required ?? true} />
                        <FormInput label="אימייל" name="party1Email" type="email" value={formData.party1Email || ''} onChange={handleDataChange} placeholder="israel@example.com" required={template.fields?.find(f=>f.id === 'party1Email')?.required ?? true} />
                        
                        <h3 className="text-xl font-bold border-b pb-2 pt-4">צד ב' (לדוגמה: שוכר/לקוח)</h3>
                        <FormInput label="שם מלא" name="party2Name" value={formData.party2Name || ''} onChange={handleDataChange} placeholder="משה לוי" required={template.fields?.find(f=>f.id === 'party2Name')?.required ?? true} />
                        <FormInput label="אימייל" name="party2Email" type="email" value={formData.party2Email || ''} onChange={handleDataChange} placeholder="moshe@example.com" required={template.fields?.find(f=>f.id === 'party2Email')?.required ?? true} />
                    </>
                )}
                {currentStep !== 1 && fieldsForCurrentStep.map(field => (
                     <FormInput 
                        key={field.id}
                        label={field.label} 
                        name={field.id} 
                        type={field.type} 
                        value={formData[field.id] || ''} 
                        onChange={handleDataChange} 
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                ))}
                {currentStep !== 1 && fieldsForCurrentStep.length === 0 && (
                    <p className="text-muted-foreground">אין שדות מוגדרים לשלב זה בתבנית.</p>
                )}
            </div>
        );
    };

    if (isPageLoading || !currentUser) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">טוען...</p>
            </div>
        );
    }
    
    if (signingUrl) {
        return (
            <Card className="rounded-2xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">ממשק חתימה</CardTitle>
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
                <p className="text-xl text-destructive mb-4">{error || "שגיאה: לא ניתן היה לטעון את תבנית החוזה."}</p>
                <Button onClick={() => router.push('/templates')} variant="outline" className="mt-4">חזור למאגר התבניות</Button>
            </div>
        );
    }
    
    const progressPercentage = (currentStep / STEPS_CONFIG.length) * 100;

    return (
        <section className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-extrabold">יצירת: {formData.contractTitle || template.title}</h1>
                <p className="mt-2 text-md text-muted-foreground">מלא/י את הפרטים הבאים ליצירת החוזה. הטיוטה נשמרת אוטומטית.</p>
            </div>

            <Progress value={progressPercentage} className="w-full h-2.5 mb-8 rounded-full" />
            
            <div className="max-w-full lg:max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <div className="lg:col-span-3 order-1 lg:sticky lg:top-28 self-start h-fit">
                    <Card className="shadow-md rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">שלבי יצירה</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {STEPS_CONFIG.map((s, index) => (
                                    <li key={index} 
                                        className={`flex items-center p-3 rounded-lg transition-all cursor-default
                                            ${currentStep === index + 1 ? 'bg-primary/10 text-primary font-semibold border-r-4 border-primary' : 
                                            (currentStep > index + 1 ? 'text-accent/80' : 'text-muted-foreground hover:bg-muted/50')}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ml-3 flex-shrink-0 text-xs
                                            ${currentStep === index + 1 ? 'bg-primary text-primary-foreground' : 
                                            (currentStep > index + 1 ? 'bg-accent text-accent-foreground' : 'bg-secondary border')}`}>
                                            {currentStep > index + 1 ? <CheckCircle className="w-4 h-4"/> : index + 1}
                                        </div>
                                        {s.name}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                     {isSaving && <p className="text-xs text-muted-foreground text-center mt-2">שומר טיוטה...</p>}
                </div>

                <div className="lg:col-span-5 order-3 lg:order-2">
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl">{STEPS_CONFIG[currentStep-1].name}</CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[300px] md:min-h-[400px]">
                            {renderStepContent()}
                        </CardContent>
                        <CardFooter className="flex justify-between items-center mt-6 pt-6 border-t">
                             <Button 
                                onClick={prevStep} 
                                variant="outline"
                                className="font-semibold"
                                disabled={currentStep === 1 || isSaving}
                            >
                                <ChevronRight className="ml-2 w-5 h-5" />
                                הקודם
                            </Button>
                            <Button 
                                onClick={nextStep} 
                                className="font-semibold" 
                                disabled={currentStep >= STEPS_CONFIG.length || isSaving}
                                variant={currentStep === STEPS_CONFIG.length -1 ? "accent" : "default"}
                            >
                                {currentStep === STEPS_CONFIG.length -1 ? "סקירה ושליחה" : "הבא"}
                                <ChevronLeft className="mr-2 w-5 h-5" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
                
                <div className="lg:col-span-4 order-2 lg:order-3 lg:sticky lg:top-28 self-start h-fit">
                   <ContractLivePreview template={template} formData={formData} contractTitle={formData.contractTitle || template.title} />
                </div>
            </div>
        </section>
    );
}

