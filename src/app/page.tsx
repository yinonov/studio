
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react'; // For RTL "Next" arrow

const HeroSection = () => (
  <section className="text-center py-16 sm:py-24">
    <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground/90 leading-tight">
      <span className="block">יצירת חוזים משפטיים לישראל</span>
      <span className="block text-primary">בדקות, לא בימים.</span>
    </h1>
    <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
      פלטפורמה ליצירה וניהול חוזים המותאמת לעסקים ויחידים בישראל. תחשבו על שילוב של DocuSign ו-LegalZoom, אבל מותאם במיוחד לשוק הישראלי.
    </p>
    <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
      <Button size="lg" asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transform hover:scale-105 transition-all text-lg py-3 px-8">
        <Link href="/templates">
          צור את החוזה הראשון שלך
          <ArrowLeft className="mr-2 h-5 w-5" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild className="w-full sm:w-auto shadow-lg border-primary/50 hover:bg-primary/10 text-lg py-3 px-8">
        <Link href="/templates">
          צפה בתבניות
        </Link>
      </Button>
    </div>
  </section>
);

// Placeholder for other sections if needed from original HomePage
// const FeaturesSection = () => ( ... );
// const ValuePropositionSection = () => ( ... );

export default function HomePage() {
  return (
    <div className="space-y-16 md:space-y-20">
      <HeroSection />
      {/* Add other sections here if they were part of the refactored code's HomePage */}
      {/* e.g. <FeaturesSection /> */}
      {/* e.g. <ValuePropositionSection /> */}
    </div>
  );
}
