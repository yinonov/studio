
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, UserCircle, Loader2, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { currentUser, logout, isFirebaseLoading } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-card shadow-sm sticky top-0 z-50 border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 md:py-4">
          <Link href="/" className="flex items-center gap-2 text-xl md:text-2xl font-bold text-primary-foreground hover:text-accent transition-colors">
            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            <span className="hidden sm:inline">חוזים חכמים</span>
            <span className="sm:hidden">חוזים</span>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant={pathname === '/templates' ? 'secondary' : 'ghost'} 
              asChild 
              className="text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2 h-auto"
            >
              <Link href="/templates">תבניות</Link>
            </Button>

            {isFirebaseLoading ? (
               <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
            ) : currentUser ? (
              <>
                <Button 
                  variant={pathname === '/dashboard' ? 'secondary' : 'ghost'} 
                  asChild 
                  className="text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2 h-auto"
                >
                  <Link href="/dashboard" className="flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4 hidden sm:inline" />
                    לוח הבקרה
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={logout} 
                  className="text-sm sm:text-base px-2 sm:px-3 py-1 sm:py-2 h-auto"
                  title={`התנתק (${currentUser.displayName || currentUser.email || currentUser.phoneNumber || 'משתמש'})`}
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">התנתק</span>
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                asChild 
                className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 h-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link href="/login" className="flex items-center gap-1 sm:gap-1.5">
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  כניסה
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
