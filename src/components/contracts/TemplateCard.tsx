'use client';

import Link from 'next/link';
import type { Template } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const IconComponent = template.icon || FileText;

  return (
    <Card className='flex h-full flex-col overflow-hidden rounded-2xl border-border shadow-lg transition-shadow duration-300 hover:border-primary hover:shadow-xl'>
      <CardHeader className='p-6 text-center'>
        {IconComponent && (
          <div className='mb-4 flex justify-center'>
            <IconComponent className='h-10 w-10 text-primary' />
          </div>
        )}
        <CardTitle className='text-xl font-bold text-gray-900'>
          {template.title}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-grow p-6 text-center'>
        <CardDescription className='leading-relaxed text-gray-600'>
          {template.description}
        </CardDescription>
      </CardContent>
      <CardFooter className='border-t bg-muted/30 p-4 sm:p-6'>
        <Button
          asChild
          className='w-full font-semibold transition-transform hover:scale-105'
        >
          <Link href={`/templates/${template.id}/create`}>
            השתמש בתבנית
            <ArrowLeft className='mr-2 h-4 w-4' />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
