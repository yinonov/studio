'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import {
  updateTemplate,
  fetchAllTemplatesForAdmin,
} from '@/firebase/adminTemplateServices';
import type { Template, TemplateField } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ChevronRight, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'נדל"ן',
  'שירותים',
  'עסקי',
  'משפטי',
  'רפואי',
  'חינוך',
  'אחר',
];

const FIELD_TYPES = [
  { value: 'text', label: 'טקסט' },
  { value: 'email', label: 'אימייל' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'textarea', label: 'טקסט ארוך' },
];

export default function EditTemplatePage() {
  const { currentUser, isFirebaseLoading } = useAuth();
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const router = useRouter();
  const params = useParams();
  const templateId =
    typeof params.templateId === 'string' ? params.templateId : null;
  const { toast } = useToast();

  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  });

  const [fields, setFields] = useState<TemplateField[]>([]);
  const [baseClauses, setBaseClauses] = useState<string[]>([]);
  const [creationSteps, setCreationSteps] = useState<
    Array<{
      name: string;
      description?: string;
      fieldIds: string[];
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTemplate = useCallback(async () => {
    try {
      setIsLoading(true);
      const templates = await fetchAllTemplatesForAdmin();
      const foundTemplate = templates.find(t => t.id === templateId);

      if (!foundTemplate) {
        toast({
          title: 'שגיאה',
          description: 'תבנית לא נמצאה',
          variant: 'destructive',
        });
        router.push('/admin/templates');
        return;
      }

      setTemplate(foundTemplate);
      setFormData({
        title: foundTemplate.title,
        category: foundTemplate.category,
        description: foundTemplate.description,
      });
      setFields((foundTemplate.fields || []) as TemplateField[]);
      setBaseClauses(foundTemplate.baseClauses || []);
      setCreationSteps(foundTemplate.creationSteps || []);
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לטעון את התבנית',
        variant: 'destructive',
      });
      router.push('/admin/templates');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, toast, router]);

  useEffect(() => {
    if (isFirebaseLoading || isCheckingAdmin) return;

    if (!currentUser || !isAdmin) {
      router.push('/admin/templates');
      return;
    }

    if (!templateId) {
      toast({
        title: 'שגיאה',
        description: 'מזהה תבנית לא תקין',
        variant: 'destructive',
      });
      router.push('/admin/templates');
      return;
    }

    loadTemplate();
  }, [
    currentUser,
    isFirebaseLoading,
    isAdmin,
    isCheckingAdmin,
    templateId,
    router,
    toast,
    loadTemplate,
  ]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addClause = () => {
    setBaseClauses(prev => [...prev, '']);
  };

  const removeClause = (index: number) => {
    setBaseClauses(prev => prev.filter((_, i) => i !== index));
  };

  const updateClause = (index: number, value: string) => {
    setBaseClauses(prev =>
      prev.map((clause, i) => (i === index ? value : clause))
    );
  };

  // Creation Steps Management with nested fields
  const addStep = () => {
    setCreationSteps(prev => [
      ...prev,
      {
        name: '',
        description: '',
        fieldIds: [],
      },
    ]);
  };

  const removeStep = (index: number) => {
    const step = creationSteps[index];
    // Remove fields that belong to this step
    setFields(prev => prev.filter(field => !step.fieldIds.includes(field.id)));
    setCreationSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (
    index: number,
    updates: Partial<{
      name: string;
      description?: string;
      fieldIds: string[];
    }>
  ) => {
    setCreationSteps(prev =>
      prev.map((step, i) => (i === index ? { ...step, ...updates } : step))
    );
  };

  const addFieldToStep = (stepIndex: number) => {
    const newFieldId = `field_${Date.now()}`;
    const newField: TemplateField = {
      id: newFieldId,
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
    };

    // Add field to global fields array
    setFields(prev => [...prev, newField]);

    // Add field ID to step
    setCreationSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex
          ? { ...step, fieldIds: [...step.fieldIds, newFieldId] }
          : step
      )
    );
  };

  const removeFieldFromStep = (fieldId: string, stepIndex: number) => {
    // Remove field from global fields array
    setFields(prev => prev.filter(field => field.id !== fieldId));

    // Remove field ID from step
    setCreationSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex
          ? { ...step, fieldIds: step.fieldIds.filter(id => id !== fieldId) }
          : step
      )
    );
  };

  const updateFieldInStep = (
    fieldId: string,
    updates: Partial<TemplateField>
  ) => {
    setFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateId) return;

    if (
      !formData.title.trim() ||
      !formData.category ||
      !formData.description.trim()
    ) {
      toast({
        title: 'שגיאה',
        description: 'אנא מלא את כל השדות הנדרשים',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אנא הוסף לפחות שדה אחד',
        variant: 'destructive',
      });
      return;
    }

    // Validate creation steps
    if (creationSteps.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אנא הוסף לפחות שלב אחד',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all steps have names
    for (let i = 0; i < creationSteps.length; i++) {
      const step = creationSteps[i];
      if (!step.name.trim()) {
        toast({
          title: 'שגיאה',
          description: `שלב ${i + 1}: שם השלב הוא שדה חובה`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field.label.trim() || !field.id.trim()) {
        toast({
          title: 'שגיאה',
          description: `שדה ${i + 1}: תווית ומזהה הם שדות חובה`,
          variant: 'destructive',
        });
        return;
      }
    }

    const validClauses = baseClauses.filter(clause => clause.trim());
    if (validClauses.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אנא הוסף לפחות סעיף אחד',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const templateData = {
        id: templateId,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fields: fields.map(field => ({
          ...field,
          label: field.label.trim(),
          id: field.id.trim(),
        })),
        baseClauses: validClauses,
        creationSteps: creationSteps.length > 0 ? creationSteps : undefined,
      };

      await updateTemplate(templateData);

      toast({
        title: 'הצלחה',
        description: 'התבנית עודכנה בהצלחה',
      });

      router.push('/admin/templates');
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לעדכן את התבנית',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFirebaseLoading || isLoading) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return null;
  }

  if (!template) {
    return (
      <div className='py-10 text-center'>
        <p className='text-xl text-destructive'>תבנית לא נמצאה</p>
        <Button
          onClick={() => router.push('/admin/templates')}
          className='mt-4'
        >
          חזור לניהול תבניות
        </Button>
      </div>
    );
  }

  return (
    <section className='space-y-8'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => router.push('/admin/templates')}
          variant='ghost'
          className='flex items-center font-semibold text-gray-600 hover:text-accent-foreground'
        >
          <ChevronRight className='ml-1 h-5 w-5' />
          חזור לניהול תבניות
        </Button>
      </div>

      <div className='text-center'>
        <h1 className='text-3xl font-extrabold text-gray-900 md:text-4xl'>
          עריכת תבנית: {template.title}
        </h1>
        <p className='mt-2 text-muted-foreground'>
          ערוך את פרטי התבנית והשדות שלה
        </p>
      </div>

      <form onSubmit={handleSubmit} className='mx-auto max-w-4xl space-y-8'>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>מידע בסיסי</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='title'>כותרת התבנית *</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                placeholder='לדוגמה: הסכם שכירות דירה'
                required
              />
            </div>

            <div>
              <Label htmlFor='category'>קטגוריה *</Label>
              <Select
                value={formData.category}
                onValueChange={value => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='בחר קטגוריה' />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='description'>תיאור התבנית *</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder='תיאור קצר של התבנית ושימושיה'
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Creation Steps with Nested Fields */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              שלבי יצירת חוזה ושדות
              <Button
                type='button'
                onClick={addStep}
                variant='outline'
                size='sm'
              >
                <Plus className='ml-2 h-4 w-4' />
                הוסף שלב
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {creationSteps.length === 0 ? (
              <p className='py-8 text-center text-muted-foreground'>
                עדיין לא הוספת שלבים. לחץ על &quot;הוסף שלב&quot; כדי להתחיל. כל
                שלב יכיל שדות משלו.
              </p>
            ) : (
              creationSteps.map((step, stepIndex) => (
                <div
                  key={stepIndex}
                  className='space-y-4 rounded-lg border bg-gray-50 p-6'
                >
                  {/* Step Header */}
                  <div className='flex items-center justify-between'>
                    <Badge variant='outline' className='px-3 py-1 text-lg'>
                      שלב {stepIndex + 1}
                    </Badge>
                    <Button
                      type='button'
                      onClick={() => removeStep(stepIndex)}
                      variant='ghost'
                      size='sm'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>

                  {/* Step Details */}
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div>
                      <Label>שם השלב *</Label>
                      <Input
                        value={step.name}
                        onChange={e =>
                          updateStep(stepIndex, { name: e.target.value })
                        }
                        placeholder='לדוגמה: פרטי הנכס'
                      />
                    </div>

                    <div>
                      <Label>תיאור השלב</Label>
                      <Input
                        value={step.description || ''}
                        onChange={e =>
                          updateStep(stepIndex, { description: e.target.value })
                        }
                        placeholder='תיאור קצר של השלב'
                      />
                    </div>
                  </div>

                  {/* Fields in this Step */}
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-base font-medium'>
                        שדות בשלב זה
                      </Label>
                      <Button
                        type='button'
                        onClick={() => addFieldToStep(stepIndex)}
                        variant='outline'
                        size='sm'
                      >
                        <Plus className='ml-2 h-4 w-4' />
                        הוסף שדה
                      </Button>
                    </div>

                    {step.fieldIds.length === 0 ? (
                      <p className='py-4 text-center text-sm text-muted-foreground'>
                        אין שדות בשלב זה. לחץ על &quot;הוסף שדה&quot; כדי
                        להוסיף.
                      </p>
                    ) : (
                      <div className='space-y-4'>
                        {step.fieldIds.map(fieldId => {
                          const field = fields.find(f => f.id === fieldId);
                          if (!field) return null;

                          return (
                            <div
                              key={fieldId}
                              className='space-y-3 rounded-lg border bg-white p-4'
                            >
                              <div className='flex items-center justify-between'>
                                <Badge variant='secondary'>שדה</Badge>
                                <Button
                                  type='button'
                                  onClick={() =>
                                    removeFieldFromStep(fieldId, stepIndex)
                                  }
                                  variant='ghost'
                                  size='sm'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>

                              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div>
                                  <Label>תווית השדה *</Label>
                                  <Input
                                    value={field.label}
                                    onChange={e =>
                                      updateFieldInStep(fieldId, {
                                        label: e.target.value,
                                      })
                                    }
                                    placeholder='לדוגמה: שם המשכיר'
                                  />
                                </div>

                                <div>
                                  <Label>מזהה השדה *</Label>
                                  <Input
                                    value={field.id}
                                    onChange={e =>
                                      updateFieldInStep(fieldId, {
                                        id: e.target.value,
                                      })
                                    }
                                    placeholder='לדוגמה: landlordName'
                                  />
                                </div>

                                <div>
                                  <Label>סוג השדה</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={value =>
                                      updateFieldInStep(fieldId, {
                                        type: value as any,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map(type => (
                                        <SelectItem
                                          key={type.value}
                                          value={type.value}
                                        >
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>טקסט עזר</Label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={e =>
                                      updateFieldInStep(fieldId, {
                                        placeholder: e.target.value,
                                      })
                                    }
                                    placeholder='טקסט עזר למשתמש'
                                  />
                                </div>
                              </div>

                              <div className='flex items-center space-x-2'>
                                <input
                                  type='checkbox'
                                  id={`required-${fieldId}`}
                                  checked={field.required || false}
                                  onChange={e =>
                                    updateFieldInStep(fieldId, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className='h-4 w-4'
                                />
                                <Label htmlFor={`required-${fieldId}`}>
                                  שדה חובה
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Base Clauses */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              סעיפי בסיס של החוזה
              <Button
                type='button'
                onClick={addClause}
                variant='outline'
                size='sm'
              >
                <Plus className='ml-2 h-4 w-4' />
                הוסף סעיף
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {baseClauses.map((clause, index) => (
              <div key={index} className='flex gap-2'>
                <Textarea
                  value={clause}
                  onChange={e => updateClause(index, e.target.value)}
                  placeholder='הכנס סעיף חוזה... ניתן להשתמש ב-{{fieldId}} להזנת נתונים דינמיים'
                  rows={2}
                  className='flex-1'
                />
                <Button
                  type='button'
                  onClick={() => removeClause(index)}
                  variant='ghost'
                  size='sm'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            ))}

            {baseClauses.length === 0 && (
              <p className='py-8 text-center text-muted-foreground'>
                עדיין לא הוספת סעיפים. לחץ על "הוסף סעיף" כדי להתחיל.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className='flex justify-center'>
          <Button
            type='submit'
            size='lg'
            disabled={isSubmitting}
            className='min-w-48'
          >
            {isSubmitting ? (
              <Loader2 className='ml-2 h-5 w-5 animate-spin' />
            ) : (
              <Save className='ml-2 h-5 w-5' />
            )}
            {isSubmitting ? 'מעדכן תבנית...' : 'עדכן תבנית'}
          </Button>
        </div>
      </form>
    </section>
  );
}
