'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { createTemplate } from '@/firebase/adminTemplateServices';
import type { TemplateField } from '@/types';
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

export default function CreateTemplatePage() {
  const { currentUser, isFirebaseLoading } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
  });

  const [fields, setFields] = useState<TemplateField[]>([]);
  const [baseClauses, setBaseClauses] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has admin access
  if (isFirebaseLoading) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    router.push('/admin/templates');
    return null;
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addField = () => {
    setFields(prev => [
      ...prev,
      {
        id: `field_${Date.now()}`,
        label: '',
        type: 'text',
        placeholder: '',
        required: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFields(prev =>
      prev.map((field, i) => (i === index ? { ...field, ...updates } : field))
    );
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fields: fields.map(field => ({
          ...field,
          label: field.label.trim(),
          id: field.id.trim(),
        })),
        baseClauses: validClauses,
      };

      await createTemplate(templateData);

      toast({
        title: 'הצלחה',
        description: 'התבנית נוצרה בהצלחה',
      });

      router.push('/admin/templates');
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה ליצור את התבנית',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          יצירת תבנית חדשה
        </h1>
        <p className='mt-2 text-muted-foreground'>
          צור תבנית חדשה למאגר התבניות
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

        {/* Template Fields */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center justify-between'>
              שדות התבנית
              <Button
                type='button'
                onClick={addField}
                variant='outline'
                size='sm'
              >
                <Plus className='ml-2 h-4 w-4' />
                הוסף שדה
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {fields.length === 0 ? (
              <p className='py-8 text-center text-muted-foreground'>
                עדיין לא הוספת שדות. לחץ על "הוסף שדה" כדי להתחיל.
              </p>
            ) : (
              fields.map((field, index) => (
                <div key={index} className='space-y-3 rounded-lg border p-4'>
                  <div className='flex items-center justify-between'>
                    <Badge variant='outline'>שדה {index + 1}</Badge>
                    <Button
                      type='button'
                      onClick={() => removeField(index)}
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
                          updateField(index, { label: e.target.value })
                        }
                        placeholder='לדוגמה: שם המשכיר'
                      />
                    </div>

                    <div>
                      <Label>מזהה השדה *</Label>
                      <Input
                        value={field.id}
                        onChange={e =>
                          updateField(index, { id: e.target.value })
                        }
                        placeholder='לדוגמה: landlordName'
                      />
                    </div>

                    <div>
                      <Label>סוג השדה</Label>
                      <Select
                        value={field.type}
                        onValueChange={value =>
                          updateField(index, { type: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
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
                          updateField(index, { placeholder: e.target.value })
                        }
                        placeholder='טקסט עזר למשתמש'
                      />
                    </div>
                  </div>

                  <div className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      id={`required-${index}`}
                      checked={field.required || false}
                      onChange={e =>
                        updateField(index, { required: e.target.checked })
                      }
                      className='h-4 w-4'
                    />
                    <Label htmlFor={`required-${index}`}>שדה חובה</Label>
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
            {isSubmitting ? 'יוצר תבנית...' : 'צור תבנית'}
          </Button>
        </div>
      </form>
    </section>
  );
}
