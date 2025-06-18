'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Template } from '@/data/templates';
import { getCurrentDateParts } from '@/data/templates';

interface ContractPreviewProps {
  template: Template | null;
  formData: Record<string, any>;
  customClauses: { description: string; legalWording: string }[];
}

export default function ContractPreview({ template, formData, customClauses }: ContractPreviewProps) {
  if (!template) {
    return (
      <Card className="shadow-lg border-primary/20 h-full">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-2xl font-headline text-primary-foreground/90">תצוגה מקדימה של החוזה</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground">טוען תצוגה מקדימה...</p>
        </CardContent>
      </Card>
    );
  }
  
  const dateParts = getCurrentDateParts();
  const fullFormData = { ...formData, ...dateParts };

  const interpolateClause = (clause: string): string => {
    return clause.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return fullFormData[key] || `[${key}]`; // Display placeholder if data not found
    });
  };

  const contractContent = template.baseClauses.map(interpolateClause).join('\n\n');
  const customClausesText = customClauses.map(c => c.legalWording).join('\n\n');

  return (
    <Card className="shadow-lg border-primary/20 h-full flex flex-col">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-2xl font-headline text-primary-foreground/90">תצוגה מקדימה: {template.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex-grow overflow-hidden">
        <ScrollArea className="h-full max-h-[600px] border border-muted p-4 rounded-md bg-white shadow-inner">
          <div className="whitespace-pre-wrap text-sm leading-relaxed font-body">
            <p className="font-bold text-lg mb-4 text-center">{template.name}</p>
            {contractContent}
            {customClausesText && (
              <>
                {contractContent ? '\n\n' : ''}
                <p className="font-bold mt-4 mb-2">סעיפים מותאמים אישית:</p>
                {customClausesText}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
