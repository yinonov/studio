// This component was part of the original "Chetz Contracts" structure.
// The new `ContractCreationPage` handles form rendering directly.
// If this specific structure for a guided form is still needed, it would have to be
// significantly adapted to work with the new step-based logic and template structure.
// For now, this file can be considered deprecated or removed.
'use client';

// import type { TemplateField } from '@/data/templates'; // Path might be outdated
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Define TemplateField locally if not importing
interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

interface GuidedCreationFormProps {
  fields: TemplateField[];
  formData: Record<string, any>;
  onFormDataChange: (fieldId: string, value: any) => void;
}

export default function GuidedCreationForm({
  fields,
  formData,
  onFormDataChange,
}: GuidedCreationFormProps) {
  const handleInputChange = (fieldId: string, value: any) => {
    onFormDataChange(fieldId, value);
  };

  if (!fields || fields.length === 0) {
    return (
      <Card className='border-primary/20 shadow-lg'>
        <CardHeader className='bg-primary/10'>
          <CardTitle className='font-headline text-2xl text-primary-foreground/90'>
            פרטי החוזה
          </CardTitle>
        </CardHeader>
        <CardContent className='p-6'>
          <p className='text-muted-foreground'>לא הוגדרו שדות עבור תבנית זו.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-primary/20 shadow-lg'>
      <CardHeader className='bg-primary/10'>
        <CardTitle className='font-headline text-2xl text-primary-foreground/90'>
          פרטי החוזה
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6 p-6'>
        {fields.map((field, index) => (
          <div key={field.id} className='space-y-2'>
            <Label
              htmlFor={field.id}
              className='text-md font-medium text-foreground/80'
            >
              {field.label}
              {field.required && (
                <span className='mr-1 text-destructive'>*</span>
              )}
            </Label>
            {field.type === 'textarea' ? (
              <Textarea
                id={field.id}
                value={formData[field.id] || ''}
                onChange={e => handleInputChange(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={3}
                className='bg-background'
              />
            ) : (
              <Input
                id={field.id}
                type={field.type}
                value={formData[field.id] || ''}
                onChange={e => handleInputChange(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                className='bg-background'
              />
            )}
            {index < fields.length - 1 && <Separator className='my-4 !mt-6' />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
