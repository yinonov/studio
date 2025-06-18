import Link from 'next/link';
import type { Template } from '@/data/templates';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react'; // For RTL "View Template" or "Create" button

interface TemplateCardProps {
  template: Template;
}

export default function TemplateCard({ template }: TemplateCardProps) {
  const IconComponent = template.icon;

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden border-primary/20">
      <CardHeader className="bg-primary/10 p-6">
        <div className="flex items-center gap-4">
          {IconComponent && <IconComponent className="w-10 h-10 text-primary" />}
          <CardTitle className="text-2xl font-headline text-primary-foreground/90">{template.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardDescription className="text-muted-foreground leading-relaxed">{template.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-6 bg-secondary/20">
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground transition-transform hover:scale-105">
          <Link href={`/templates/${template.id}/create`}>
            צור חוזה זה
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
