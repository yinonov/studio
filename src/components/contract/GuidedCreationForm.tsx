'use client';

import type { TemplateField } from '@/data/templates';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface GuidedCreationFormProps {
  fields: TemplateField[];
  formData: Record<string, any>;
  onFormDataChange: (fieldId: string, value: any) => void;
}

export default function GuidedCreationForm({ fields, formData, onFormDataChange }: GuidedCreationFormProps) {
  const handleInputChange = (fieldId: string, value: any) => {
    onFormDataChange(fieldId, value);
  };

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-2xl font-headline text-primary-foreground/90">פרטי החוזה</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-md font-medium text-foreground/80">
              {field.label}
              {field.required && <span className="text-destructive mr-1">*</span>}
            </Label>
            {field.type === 'textarea' ? (
              <Textarea
                id={field.id}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                rows={3}
                className="bg-background border-input focus:border-primary focus:ring-primary"
              />
            ) : (
              <Input
                id={field.id}
                type={field.type}
                value={formData[field.id] || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                placeholder={field.placeholder || ''}
                className="bg-background border-input focus:border-primary focus:ring-primary"
              />
            )}
            {index < fields.length - 1 && <Separator className="my-4 !mt-6" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
