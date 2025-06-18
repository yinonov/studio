import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, Users } from 'lucide-react'; // Placeholder icons

export default function Header() {
  return (
    <header className="bg-primary/10 shadow-md sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-headline font-bold text-primary-foreground hover:text-accent transition-colors">
          חץ חוזים
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20">
            <Link href="/">דף הבית</Link>
          </Button>
          <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20">
            <Link href="/templates">מאגר תבניות</Link>
          </Button>
          {/* Future links - My Contracts, Profile etc.
          <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20">
            <Link href="/dashboard">החוזים שלי</Link>
          </Button>
          */}
        </nav>
      </div>
    </header>
  );
}
