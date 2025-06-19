
'use client';

import Link from 'next/link';
import type { Template } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react'; 

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const IconComponent = template.icon || FileText;

  return (
    <Card className="flex flex-col h-full rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border-border hover:border-primary">
      <CardHeader className="p-6 text-center">
        {IconComponent && (
          <div className="mb-4 flex justify-center">
            <IconComponent className="w-10 h-10 text-primary" />
          </div>
        )}
        <CardTitle className="text-xl font-bold text-gray-900">{template.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex-grow text-center">
        <CardDescription className="text-gray-600 leading-relaxed">{template.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 sm:p-6 bg-muted/30 border-t">
        <Button asChild className="w-full font-semibold transition-transform hover:scale-105">
          <Link href={`/templates/${template.id}/create`}>
            השתמש בתבנית
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
