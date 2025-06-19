
'use client';

import type { Template } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

interface ContractLivePreviewProps {
  template: Template | null;
  formData: Record<string, string>;
  contractTitle?: string;
}

function interpolateWithDefaults(text: string, data: Record<string, string>): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/\{\{(.+?)\}\}/g, (_match, captured) => {
    const parts = captured.split('||');
    const fieldName = parts[0].trim();
    const defaultValue = parts.length > 1 ? parts[1].trim() : `[${fieldName}]`;
    
    const valueFromData = data[fieldName];

    if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
      return String(valueFromData);
    }
    return defaultValue;
  });
}

export default function ContractLivePreview({ template, formData, contractTitle }: ContractLivePreviewProps) {
  if (!template) {
    return (
      <Card className="shadow-lg rounded-2xl h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">תצוגה מקדימה של החוזה</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">טוען תבנית...</p>
        </CardContent>
      </Card>
    );
  }

  const finalTitle = contractTitle || template.title || "חוזה ללא כותרת";

  return (
    <Card className="shadow-lg rounded-2xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">תצוגה מקדימה: {finalTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[600px] md:h-[calc(100vh-260px)]"> {/* Adjusted height */}
          <div className="p-4 sm:p-6 prose prose-sm max-w-none text-right leading-relaxed text-gray-700">
            <h4 className="text-center font-bold text-xl mb-6 text-gray-900">{finalTitle}</h4>
            {template.baseClauses && template.baseClauses.length > 0 ? (
              template.baseClauses.map((clause, index) => (
                <p 
                  key={index} 
                  className="mb-3" 
                  dangerouslySetInnerHTML={{ __html: interpolateWithDefaults(clause, formData).replace(/\n/g, '<br />') }} 
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">אין סעיפים בסיסיים להצגה בתבנית זו.</p>
            )}
            {/* Placeholder for custom clauses if that feature gets added */}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
