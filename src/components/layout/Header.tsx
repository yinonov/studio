
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, UserCircle } from 'lucide-react';

export default function Header() {
  const { currentUser, logout, isLoading } = useAuth();

  return (
    <header className="bg-primary/10 shadow-md sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-2xl font-headline font-bold text-primary-foreground hover:text-accent transition-colors">
          חץ חוזים
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20 text-sm sm:text-base">
            <Link href="/">דף הבית</Link>
          </Button>
          <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20 text-sm sm:text-base">
            <Link href="/templates">מאגר תבניות</Link>
          </Button>
          
          {isLoading ? (
            <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
          ) : currentUser ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline">{currentUser.email}</span>
              <Button variant="ghost" onClick={logout} className="text-primary-foreground hover:text-accent hover:bg-primary/20 text-sm sm:text-base">
                <LogOut />
                <span className="hidden sm:inline ml-2">התנתק</span>
              </Button>
            </>
          ) : (
            <Button variant="ghost" asChild className="text-primary-foreground hover:text-accent hover:bg-primary/20 text-sm sm:text-base">
              <Link href="/login">
                <LogIn />
                <span className="hidden sm:inline ml-2">התחבר</span>
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
