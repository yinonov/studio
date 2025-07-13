'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const HeroSection = () => (
  <section className='py-16 text-center sm:py-24'>
    <h1 className='text-4xl font-extrabold leading-tight text-gray-900 md:text-6xl'>
      <span className='block'>יצירת חוזים משפטיים לישראל</span>
      <span className='block text-primary'>בדקות, לא בימים.</span>
    </h1>
    <p className='mx-auto mt-6 max-w-2xl text-lg text-gray-600 md:text-xl'>
      פלטפורמה ליצירה וניהול חוזים המותאמת לעסקים ויחידים בישראל. תחשבו על שילוב
      של DocuSign ו-LegalZoom, אבל מותאם במיוחד לשוק הישראלי.
    </p>
    <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
      <Button
        size='lg'
        asChild
        className='w-full transform px-8 py-3 text-lg shadow-lg transition-all hover:scale-105 sm:w-auto'
      >
        <Link href='/templates'>
          צור את החוזה הראשון שלך
          <ArrowLeft className='mr-2 h-5 w-5' />
        </Link>
      </Button>
      <Button
        size='lg'
        variant='outline'
        asChild
        className='w-full border-primary/50 px-8 py-3 text-lg text-primary shadow-lg hover:bg-primary/10 sm:w-auto'
      >
        <Link href='/templates'>צפה בתבניות</Link>
      </Button>
    </div>
  </section>
);

export default function HomePage() {
  return (
    <div className='space-y-16 md:space-y-20'>
      <HeroSection />
    </div>
  );
}
