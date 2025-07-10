'use client';

import { useEffect, useState } from 'react';
import TemplateCard from '@/components/contracts/TemplateCard';
import { fetchTemplates } from '@/firebase/templateServices';
import type { Template } from '@/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const templatesData = await fetchTemplates();
        setTemplates(templatesData);
      } catch (err: any) {
        console.error('Error fetching templates: ', err);
        setError('שגיאה בטעינת התבניות. נסה לרענן את הדף.');
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className='flex min-h-[calc(100vh-300px)] flex-col items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
        <p className='mt-4 text-muted-foreground'>טוען תבניות...</p>
      </div>
    );
  }

  return (
    <section className='space-y-10 md:space-y-12'>
      <div className='text-center'>
        <h1 className='text-3xl font-extrabold text-gray-900 md:text-4xl lg:text-5xl'>
          ספריית תבניות החוזים
        </h1>
        <p className='text-md mx-auto mt-3 max-w-2xl text-gray-600 md:mt-4 md:text-lg'>
          מצא/י את התבנית המשפטית המושלמת לצרכים שלך. כל התבניות מותאמות לשוק
          הישראלי.
        </p>
      </div>

      {error && (
        <div className='rounded-lg bg-destructive/10 p-4 text-center text-destructive'>
          <p>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant='link'
            className='text-destructive'
          >
            נסה לרענן
          </Button>
        </div>
      )}

      {!error && templates.length === 0 && (
        <div className='py-12 text-center'>
          <p className='mb-6 text-xl text-muted-foreground'>
            לא נמצאו תבניות זמינות כרגע. ייתכן שעדיין לא הוספנו תבניות למערכת.
          </p>
          <Button asChild>
            <Link href='/dashboard'>חזור ללוח הבקרה</Link>
          </Button>
        </div>
      )}

      {!error && templates.length > 0 && (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3'>
          {templates.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </section>
  );
}
