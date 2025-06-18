'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Template } from '@/data/templates';
import { getTemplateById } from '@/data/templates';
import GuidedCreationForm from '@/components/contract/GuidedCreationForm';
import AiClauseGenerator from '@/components/contract/AiClauseGenerator';
import ContractPreview from '@/components/contract/ContractPreview';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomClause {
  description: string;
  legalWording: string;
}

export default function CreateContractPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const templateId = typeof params.templateId === 'string' ? params.templateId : '';

  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [customClauses, setCustomClauses] = useState<CustomClause[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (templateId) {
      const fetchedTemplate = getTemplateById(templateId);
      if (fetchedTemplate) {
        setTemplate(fetchedTemplate);
        // Initialize formData with empty strings for each field
        const initialFormData = fetchedTemplate.fields.reduce((acc, field) => {
          acc[field.id] = '';
          return acc;
        }, {} as Record<string, any>);
        setFormData(initialFormData);
      } else {
        toast({
          title: 'שגיאה',
          description: 'תבנית החוזה לא נמצאה.',
          variant: 'destructive',
        });
        router.push('/templates');
      }
      setIsLoading(false);
    }
  }, [templateId, router, toast]);

  const handleFormDataChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleAddCustomClause = (description: string, legalWording: string) => {
    setCustomClauses((prev) => [...prev, { description, legalWording }]);
  };

  const handleFinalizeContract = () => {
    // Basic validation
    if (template) {
      const requiredFields = template.fields.filter(f => f.required);
      const missingFields = requiredFields.filter(f => !formData[f.id] || formData[f.id].toString().trim() === '');
      if (missingFields.length > 0) {
        toast({
          title: 'שדות חסרים',
          description: `אנא מלאו את כל שדות החובה: ${missingFields.map(f => f.label).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // In a real app, this would save the contract and navigate to a view/sign page
    // For now, we'll store it in localStorage for demonstration on a dummy contract page
    const contractData = {
      templateId,
      templateName: template?.name,
      formData,
      customClauses,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('currentContract', JSON.stringify(contractData));
    
    toast({
      title: 'החוזה נשמר (דמו)',
      description: 'החוזה מוכן לצפייה וחתימה (בגרסת דמו זו).',
    });
    router.push(`/contracts/dummy-contract-id`);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-[700px] w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (!template) {
    return <p className="text-center text-destructive text-xl">תבנית לא קיימת או שלא ניתן לטעון אותה.</p>;
  }

  return (
    <div className="space-y-10">
      <header className="text-center md:text-right py-6">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground/90 mb-2">יצירת חוזה: {template.name}</h1>
        <p className="text-md text-muted-foreground">
          מלאו את הפרטים הבאים ליצירת החוזה. תוכלו לראות תצוגה מקדימה של החוזה בזמן אמת.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8 lg:sticky lg:top-24"> {/* Make preview sticky */}
           <ContractPreview template={template} formData={formData} customClauses={customClauses} />
        </div>
        <div className="space-y-8">
          <GuidedCreationForm
            fields={template.fields}
            formData={formData}
            onFormDataChange={handleFormDataChange}
          />
          <AiClauseGenerator onAddClause={handleAddCustomClause} />
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <Button size="lg" onClick={handleFinalizeContract} className="bg-green-600 hover:bg-green-700 text-white transition-transform hover:scale-105 shadow-md">
          <Save className="ml-2 h-5 w-5" /> {/* Assuming Save icon is LTR relative to text */}
          שמור והמשך לחתימה
        </Button>
      </div>
    </div>
  );
}
