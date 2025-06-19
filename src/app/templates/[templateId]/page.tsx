
// This file can be removed if direct navigation to template detail is not needed.
// Or it can be a template detail page before creation.
// For now, redirecting to creation page or showing a message.

'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId;

  useEffect(() => {
    if (templateId) {
      router.replace(`/templates/${templateId}/create`);
    } else {
      router.replace('/templates');
    }
  }, [router, templateId]);

  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="ml-4">מעביר לדף יצירת חוזה...</p>
    </div>
  );
}
