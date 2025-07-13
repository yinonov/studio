'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTemplateById } from '@/firebase/templateServices';
import type { TemplateSchema } from '@/types';
import {
  createDraftContract,
  updateContractData,
  fetchContractById,
} from '@/firebase/contractServices';
import FormInput from '@/components/shared/FormInput';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ContractLivePreview from '@/components/contract/ContractLivePreview';

// A debounced function that can be cancelled.
interface DebouncedFunction<F extends (...args: any[]) => any> {
  (...args: Parameters<F>): void;
  cancel(): void;
}

function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number
): DebouncedFunction<F> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debouncedFunction = (...args: Parameters<F>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };

  debouncedFunction.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debouncedFunction;
}

const STEPS_CONFIG = [
  {
    name: 'צדדים וכותרת',
    fields: [
      'contractTitle',
      'signer1Name',
      'signer1Email',
      'signer2Name',
      'signer2Email',
    ],
  },
  {
    name: 'תנאים עיקריים',
    fields: [
      'address',
      'rentAmount',
      'startDate',
      'serviceDescription',
      'serviceFee',
      'effectiveDate',
      'confidentialInformationDescription',
      'disclosingParty',
      'receivingParty',
      'additionalNotes',
    ],
  },
  { name: 'סקירה וסיום', fields: [] },
];

export default function ContractCreationPage() {
  const { currentUser, isFirebaseLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const templateId =
    typeof params.templateId === 'string' ? params.templateId : null;
  const { toast } = useToast();

  const [template, setTemplate] = useState<TemplateSchema | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [contractId, setContractId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState('');

  // Add a ref to prevent duplicate contract creation
  const hasCreatedContract = useRef(false);

  // useRef to hold the debounced function to ensure it's stable across renders
  const debouncedSaveRef = useRef(
    debounce(
      async (
        cid: string,
        data: Record<string, string>,
        currentTemplate: TemplateSchema
      ) => {
        if (!cid || Object.keys(data).length === 0) return;
        setIsSaving(true);
        try {
          const contractTitle =
            data.contractTitle || currentTemplate.title || 'חוזה ללא כותרת';

          await updateContractData(cid, {
            formData: data,
            title: contractTitle,
            status: 'draft',
          });
        } catch (err) {
          console.error('Error auto-saving draft:', err);
          toast({
            title: 'שגיאה בשמירת טיוטה אוטומטית',
            variant: 'destructive',
          });
        } finally {
          setIsSaving(false);
        }
      },
      1500
    )
  );

  useEffect(() => {
    if (isFirebaseLoading) return;
    if (!currentUser) {
      const redirectPath = templateId
        ? `/templates/${templateId}/create`
        : '/templates';
      const queryParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams('');
      const existingContractId = queryParams.get('contractId');
      const finalRedirect = existingContractId
        ? `${redirectPath}?contractId=${existingContractId}`
        : redirectPath;
      router.push(`/login?redirect=${encodeURIComponent(finalRedirect)}`);
      return;
    }
    if (!templateId) {
      toast({
        title: 'שגיאה',
        description: 'מזהה תבנית חסר.',
        variant: 'destructive',
      });
      router.push('/templates');
      return;
    }

    const loadTemplateAndDraft = async () => {
      setIsPageLoading(true);
      try {
        const fetchedTemplate = await fetchTemplateById(templateId);
        if (!fetchedTemplate) {
          toast({
            title: 'שגיאה',
            description: 'תבנית לא נמצאה.',
            variant: 'destructive',
          });
          router.push('/templates');
          return;
        }
        setTemplate(fetchedTemplate);

        const queryParams =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams('');
        const existingContractId = queryParams.get('contractId');

        const initialData: Record<string, string> = {};
        (fetchedTemplate.fields || []).forEach(
          (field: {
            id: string;
            label: string;
            type: string;
            placeholder?: string;
            required?: boolean;
          }) => {
            if (
              field.id &&
              fetchedTemplate.defaultValues &&
              fetchedTemplate.defaultValues[field.id]
            ) {
              initialData[field.id] = fetchedTemplate.defaultValues[field.id];
            } else if (field.id) {
              initialData[field.id] = '';
            }
          }
        );
        if (!initialData.contractTitle && fetchedTemplate.title) {
          initialData.contractTitle = fetchedTemplate.title;
        }

        if (existingContractId) {
          const existingContract = await fetchContractById(existingContractId);
          if (
            existingContract &&
            existingContract.ownerId === currentUser.uid
          ) {
            setContractId(existingContractId);
            setFormData(() => ({
              ...initialData,
              ...existingContract.formData,
              contractTitle:
                existingContract.title ||
                initialData.contractTitle ||
                fetchedTemplate.title,
            }));
            toast({
              title: 'טיוטה נטענה',
              description: 'ממשיך עריכת טיוטה קיימת.',
            });
          } else if (existingContract) {
            setError('אין לך הרשאה לערוך טיוטה זו.');
            toast({
              title: 'שגיאת הרשאה',
              description: 'אינך מורשה לערוך טיוטה זו.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'שגיאה',
              description: 'טיוטה קיימת לא נמצאה.',
              variant: 'destructive',
            });
            // Only create if we haven't already created one
            if (!hasCreatedContract.current && !contractId) {
              hasCreatedContract.current = true;
              const newContractId = await createDraftContract(
                currentUser.uid,
                fetchedTemplate,
                initialData
              );
              setContractId(newContractId);
              setFormData(initialData);

              // Update URL to include the new contract ID
              const newUrl = `${window.location.pathname}?contractId=${newContractId}`;
              window.history.replaceState({}, '', newUrl);
            }
          }
        } else {
          // Only create a new contract if we haven't already created one
          if (!hasCreatedContract.current && !contractId) {
            hasCreatedContract.current = true;
            const newContractId = await createDraftContract(
              currentUser.uid,
              fetchedTemplate,
              initialData
            );
            setContractId(newContractId);
            setFormData(initialData);

            // Update URL to include the new contract ID without triggering navigation
            const newUrl = `${window.location.pathname}?contractId=${newContractId}`;
            window.history.replaceState({}, '', newUrl);
          }
        }
      } catch (err: any) {
        setError('שגיאה בטעינת תבנית או יצירת טיוטה.');
        toast({
          title: 'שגיאה',
          description: err.message || 'לא ניתן היה לטעון את הדף.',
          variant: 'destructive',
        });
        console.error(err);
      } finally {
        setIsPageLoading(false);
      }
    };
    loadTemplateAndDraft();

    // Cleanup function to reset the creation flag if dependencies change
    return () => {
      hasCreatedContract.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, isFirebaseLoading, templateId]); // Only depend on stable values

  const handleDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    if (contractId && template) {
      debouncedSaveRef.current(contractId, newFormData, template);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS_CONFIG.length && template) {
      const currentStepConfig = STEPS_CONFIG[currentStep - 1];
      const missingRequired = template.fields?.filter(
        (f: any) =>
          f.required &&
          currentStepConfig.fields.includes(f.id) &&
          (!formData[f.id] || String(formData[f.id]).trim() === '')
      );
      if (missingRequired && missingRequired.length > 0) {
        toast({
          title: 'שדות חובה חסרים',
          description: `אנא מלא: ${missingRequired
            .map((f: any) => f.label)
            .join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };
  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinalizeAndSave = async () => {
    if (!contractId || !template) {
      toast({
        title: 'שגיאה',
        description: 'מזהה חוזה או תבנית לא קיימים.',
        variant: 'destructive',
      });
      return;
    }

    debouncedSaveRef.current.cancel(); // Cancel any pending auto-save before final save

    setIsSaving(true);
    setError('');
    try {
      const contractTitle =
        formData.contractTitle || template.title || 'חוזה ללא כותרת';

      await updateContractData(contractId, {
        formData,
        title: contractTitle,
        status: 'draft',
      });
      toast({ title: 'טיוטה נשמרה!', description: 'החוזה נשמר כטיוטה.' });
      router.push(`/contracts/${contractId}`);
    } catch (err: any) {
      setError('שמירת החוזה הסופית נכשלה.');
      toast({
        title: 'שגיאה בשמירת החוזה',
        description: err.message,
        variant: 'destructive',
      });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    if (!template)
      return <Loader2 className='mx-auto h-8 w-8 animate-spin text-primary' />;

    const currentStepConfig = STEPS_CONFIG[currentStep - 1];

    if (currentStep === STEPS_CONFIG.length) {
      return (
        <div className='space-y-6 text-center'>
          <h3 className='text-2xl font-bold'>סקירה ושמירת טיוטה</h3>
          <p className='text-muted-foreground'>
            אנא בדוק/י את כל הפרטים שהזנת בתצוגה המקדימה. לחיצה על הכפתור תשמור
            את החוזה כטיוטה ותעביר אותך לדף פרטי החוזה.
          </p>
          <Button
            onClick={handleFinalizeAndSave}
            size='lg'
            variant='accent'
            className='font-semibold'
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className='ml-2 animate-spin' />
            ) : (
              <Save className='ml-2 h-5 w-5' />
            )}
            {isSaving ? 'שומר...' : 'שמור טיוטה ועבור לפרטים'}
          </Button>
          {error && <p className='mt-4 text-sm text-destructive'>{error}</p>}
        </div>
      );
    }

    const fieldsForCurrentStep =
      template.fields?.filter(
        (field: any) => field.id && currentStepConfig.fields.includes(field.id)
      ) || [];

    if (currentStep === 1) {
      const signerFieldsConfig = [
        {
          id: 'contractTitle',
          label: 'כותרת החוזה (פנימי)',
          type: 'text',
          placeholder: 'לדוגמה: הסכם שכירות הרצל 1',
          required: true,
          group: 'כותרת',
        },
        {
          id: 'signer1Name',
          label: "שם חותם א'",
          type: 'text',
          placeholder: 'ישראל ישראלי',
          required: true,
          group: "חותם א'",
        },
        {
          id: 'signer1Email',
          label: "אימייל חותם א'",
          type: 'email',
          placeholder: 'israel@example.com',
          required: true,
          group: "חותם א'",
        },
        {
          id: 'signer2Name',
          label: "שם חותם ב'",
          type: 'text',
          placeholder: 'שרה לוי',
          required:
            template.fields?.find((f: any) => f.id === 'signer2Name')
              ?.required || false,
          group: "חותם ב'",
        },
        {
          id: 'signer2Email',
          label: "אימייל חותם ב'",
          type: 'email',
          placeholder: 'sarah@example.com',
          required:
            template.fields?.find(f => f.id === 'signer2Email')?.required ||
            false,
          group: "חותם ב'",
        },
      ];

      let lastGroup = '';
      return (
        <div className='space-y-6'>
          {signerFieldsConfig.map(field => {
            const templateFieldDefinition = template.fields?.find(
              (f: any) => f.id === field.id
            );
            const isRequired =
              templateFieldDefinition?.required !== undefined
                ? templateFieldDefinition.required
                : field.required;

            const showGroupHeader = field.group && field.group !== lastGroup;
            if (field.group) lastGroup = field.group;
            return (
              <React.Fragment key={field.id}>
                {showGroupHeader && (
                  <h3 className='border-b pb-2 pt-4 text-xl font-bold'>
                    {field.group}
                  </h3>
                )}
                <FormInput
                  label={field.label}
                  name={field.id}
                  type={field.type as 'text' | 'email'}
                  value={formData[field.id] || ''}
                  onChange={handleDataChange}
                  placeholder={field.placeholder}
                  required={isRequired}
                />
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {fieldsForCurrentStep.map((field: any) => (
          <FormInput
            key={field.id}
            label={field.label}
            name={field.id}
            type={field.type as 'text' | 'number' | 'date' | 'textarea'}
            value={formData[field.id] || ''}
            onChange={handleDataChange}
            placeholder={field.placeholder}
            required={field.required}
          />
        ))}
        {fieldsForCurrentStep.length === 0 &&
          currentStep !== STEPS_CONFIG.length && (
            <p className='text-muted-foreground'>
              אין שדות מוגדרים לשלב זה בתבנית. לחץ על &quot;הבא&quot; כדי
              להמשיך.
            </p>
          )}
      </div>
    );
  };

  if (isPageLoading || (!currentUser && !isFirebaseLoading)) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] flex-col items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
        <p className='mt-4 text-muted-foreground'>טוען...</p>
      </div>
    );
  }

  if (!template && !isPageLoading) {
    return (
      <div className='py-10 text-center'>
        <p className='mb-4 text-xl text-destructive'>
          {error || 'שגיאה: לא ניתן היה לטעון את תבנית החוזה.'}
        </p>
        <Button
          onClick={() => router.push('/templates')}
          variant='outline'
          className='mt-4'
        >
          חזור למאגר התבניות
        </Button>
      </div>
    );
  }

  if (error && !template && currentUser) {
    return (
      <div className='py-10 text-center'>
        <p className='mb-4 text-xl text-destructive'>{error}</p>
        <Button
          onClick={() => router.push('/templates')}
          variant='outline'
          className='mt-4'
        >
          חזור למאגר התבניות
        </Button>
      </div>
    );
  }

  const progressPercentage = (currentStep / STEPS_CONFIG.length) * 100;

  return (
    <section className='space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-extrabold md:text-4xl'>
          יצירת: {formData.contractTitle || template?.title || 'טעינת כותרת...'}
        </h1>
        <p className='text-md mt-2 text-muted-foreground'>
          מלא/י את הפרטים הבאים ליצירת החוזה. הטיוטה נשמרת אוטומטית.
        </p>
      </div>

      <Progress
        value={progressPercentage}
        className='mb-8 h-2.5 w-full rounded-full'
      />

      <div className='mx-auto grid max-w-full grid-cols-1 gap-6 md:gap-8 lg:max-w-screen-xl lg:grid-cols-12'>
        <div className='order-1 h-fit self-start lg:sticky lg:top-28 lg:col-span-3'>
          <Card className='rounded-2xl shadow-md'>
            <CardHeader>
              <CardTitle className='text-lg font-semibold'>
                שלבי יצירה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='space-y-3'>
                {STEPS_CONFIG.map((s, index) => (
                  <li
                    key={index}
                    className={`flex cursor-default items-center rounded-lg p-3 transition-all ${
                      currentStep === index + 1
                        ? 'border-r-4 border-primary bg-primary/10 font-semibold text-primary'
                        : currentStep > index + 1
                          ? 'text-accent/80'
                          : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`ml-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                        currentStep === index + 1
                          ? 'bg-primary text-primary-foreground'
                          : currentStep > index + 1
                            ? 'bg-accent text-accent-foreground'
                            : 'border bg-secondary'
                      }`}
                    >
                      {currentStep > index + 1 ? (
                        <CheckCircle className='h-4 w-4' />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {s.name}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {isSaving && (
            <p className='mt-2 text-center text-xs text-muted-foreground'>
              שומר טיוטה...
            </p>
          )}
        </div>

        <div className='order-3 lg:order-2 lg:col-span-5'>
          <Card className='rounded-2xl shadow-lg'>
            <CardHeader>
              <CardTitle className='text-2xl'>
                {STEPS_CONFIG[currentStep - 1]?.name || 'טוען שלב...'}
              </CardTitle>
            </CardHeader>
            <CardContent className='min-h-[300px] md:min-h-[400px]'>
              {template && renderStepContent()}
            </CardContent>
            <CardFooter className='mt-6 flex items-center justify-between border-t pt-6'>
              <Button
                onClick={prevStep}
                variant='outline'
                className='font-semibold'
                disabled={currentStep === 1 || isSaving}
              >
                <ChevronRight className='ml-2 h-5 w-5' />
                הקודם
              </Button>
              {currentStep < STEPS_CONFIG.length ? (
                <Button
                  onClick={nextStep}
                  className='font-semibold'
                  disabled={isSaving}
                  variant={
                    currentStep === STEPS_CONFIG.length - 1
                      ? 'accent'
                      : 'default'
                  }
                >
                  {currentStep === STEPS_CONFIG.length - 1
                    ? 'סקירה וסיום'
                    : 'הבא'}
                  <ChevronLeft className='mr-2 h-5 w-5' />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizeAndSave}
                  size='lg'
                  variant='accent'
                  className='font-semibold'
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className='ml-2 animate-spin' />
                  ) : (
                    <Save className='ml-2 h-5 w-5' />
                  )}
                  {isSaving ? 'שומר...' : 'שמור טיוטה ועבור לפרטים'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className='order-2 h-fit self-start lg:sticky lg:top-28 lg:order-3 lg:col-span-4'>
          <ContractLivePreview
            template={template}
            formData={formData}
            contractTitle={formData.contractTitle || template?.title}
          />
        </div>
      </div>
    </section>
  );
}
