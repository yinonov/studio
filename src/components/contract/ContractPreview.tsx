// This component was part of the original "Chetz Contracts" structure.
// The new provided code has its own preview logic within ContractViewPage or implied within ContractCreationPage.
// If a dedicated preview component is still needed for the new structure (e.g., during creation),
// it would need to be adapted.
// For now, this file can be considered deprecated or removed if not used by the new structure.
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// getCurrentDateParts might be needed if this component is used and requires date interpolation
// import { getCurrentDateParts } from '@/data/templates'; // Assuming this path is still valid or adapted

interface OldContractPreviewProps {
  template: any | null; // Use a more specific type if available
  formData: Record<string, any>;
  customClauses: { description: string; legalWording: string }[];
}

export default function ContractPreview({
  template,
  formData,
  customClauses,
}: OldContractPreviewProps) {
  if (!template) {
    return (
      <Card className='h-full border-primary/20 shadow-lg'>
        <CardHeader className='bg-primary/10'>
          <CardTitle className='font-headline text-2xl text-primary-foreground/90'>
            תצוגה מקדימה של החוזה
          </CardTitle>
        </CardHeader>
        <CardContent className='p-6'>
          <p className='text-muted-foreground'>טוען תצוגה מקדימה...</p>
        </CardContent>
      </Card>
    );
  }

  // const dateParts = getCurrentDateParts();
  // const fullFormData = { ...formData, ...dateParts };

  const interpolateClause = (clause: string): string => {
    // return clause.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    //   return fullFormData[key] || `[${key}]`;
    // });
    // Simplified interpolation for this deprecated component
    return clause.replace(
      /\{\{(\w+)\}\}/g,
      (match, key) => formData[key] || `[${key}]`
    );
  };

  const contractContent =
    template.baseClauses?.map(interpolateClause).join('\n\n') ||
    'אין תוכן בסיסי לתבנית זו.';
  const customClausesText = customClauses
    ?.map(c => c.legalWording)
    .join('\n\n');

  return (
    <Card className='flex h-full flex-col border-primary/20 shadow-lg'>
      <CardHeader className='bg-primary/10'>
        <CardTitle className='font-headline text-2xl text-primary-foreground/90'>
          תצוגה מקדימה: {template.name || template.title}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow overflow-hidden p-6'>
        <ScrollArea className='h-full max-h-[600px] rounded-md border border-muted bg-background p-4 shadow-inner'>
          <div className='font-body whitespace-pre-wrap text-sm leading-relaxed'>
            <p className='mb-4 text-center text-lg font-bold'>
              {template.name || template.title}
            </p>
            {contractContent}
            {customClausesText && (
              <>
                {contractContent ? '\n\n' : ''}
                <p className='mb-2 mt-4 font-bold'>סעיפים מותאמים אישית:</p>
                {customClausesText}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
