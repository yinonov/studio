// src/app/templates/[templateId]/page.tsx
import { redirect } from 'next/navigation';

// No 'use client' here - this is now a Server Component

export async function generateStaticParams() {
  // For `output: 'export'`, dynamic Server Components need this.
  // Returning an empty array means Next.js won't pre-render any specific
  // instances of this redirector page at build time.
  return [];
}

// Params will be { templateId: string }
export default function TemplateRedirectPage({ params }: { params: { templateId: string } }) {
  const { templateId } = params;

  if (templateId) {
    redirect(`/templates/${templateId}/create`);
  } else {
    // This case should ideally not happen if templateId is always present in the route.
    // Redirect to the general templates page as a fallback.
    redirect('/templates');
  }

  // This component will not actually render anything visible because the redirect occurs before rendering.
  // However, React requires a component to return valid JSX or null.
  return null;
}
