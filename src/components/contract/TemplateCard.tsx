import Link from 'next/link';
import type { Template } from '@/data/templates';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react'; // For RTL "View Template" or "Create" button

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const IconComponent = template.icon;

  return (
    <Card className='flex h-full flex-col overflow-hidden rounded-lg border-primary/20 shadow-lg transition-shadow duration-300 hover:shadow-xl'>
      <CardHeader className='bg-primary/10 p-6'>
        <div className='flex items-center gap-4'>
          {IconComponent && (
            <IconComponent className='h-10 w-10 text-primary' />
          )}
          <CardTitle className='font-headline text-2xl text-primary-foreground/90'>
            {template.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='flex-grow p-6'>
        <CardDescription className='leading-relaxed text-muted-foreground'>
          {template.description}
        </CardDescription>
      </CardContent>
      <CardFooter className='bg-secondary/20 p-6'>
        <Button
          asChild
          className='w-full bg-accent text-accent-foreground transition-transform hover:scale-105 hover:bg-accent/90'
        >
          <Link href={`/templates/${template.id}/create`}>
            צור חוזה זה
            <ArrowLeft className='mr-2 h-4 w-4' />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
