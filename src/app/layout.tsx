import type { Metadata } from 'next';
import './globals.css';
import { Heebo } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';

export const metadata: Metadata = {
  title: 'חוזים חכמים | Smart Contracts IL',
  description:
    'יצירה וניהול חוזים חכמים לעסקים ואנשים פרטיים בישראל, מותאם לשוק הישראלי.',
};

const heebo = Heebo({
  weight: ['300', '400', '500', '700', '800', '900'],
  subsets: ['hebrew'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='he' dir='rtl'>
      <body
        className={`${heebo.className} flex min-h-screen flex-col bg-background text-foreground antialiased`}
      >
        <AuthProvider>
          <AdminProvider>
            <Header />
            <main className='container mx-auto flex-grow px-4 py-8 sm:px-6 sm:py-12 lg:px-8'>
              {children}
            </main>
            <Footer />
            <Toaster />
          </AdminProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
