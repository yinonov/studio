// src/app/templates/[templateId]/page.tsx
import { redirect } from 'next/navigation';

// No 'use client' here - this is a Server Component

// generateStaticParams is no longer strictly required to prevent build errors
// when not using output: 'export'. It can be removed for simplicity here
// as this page's sole purpose is redirection.
// export async function generateStaticParams() {
//   return [];
// }

// Params will be { templateId: string }
export default async function TemplateRedirectPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

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
