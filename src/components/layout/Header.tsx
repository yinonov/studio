'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  LogIn,
  LogOut,
  Loader2,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { currentUser, logout, isFirebaseLoading } = useAuth();
  const pathname = usePathname();

  return (
    <header className='sticky top-0 z-50 border-b bg-card shadow-sm'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between py-3 md:py-4'>
          <Link
            href='/'
            className='flex items-center gap-2 text-xl font-bold text-gray-900 transition-colors hover:text-primary md:text-2xl'
          >
            <ShieldCheck className='h-7 w-7 text-primary md:h-8 md:w-8' />
            <span className='hidden sm:inline'>חוזים חכמים</span>
            <span className='sm:hidden'>חוזים</span>
          </Link>

          <nav className='flex items-center gap-2 sm:gap-4'>
            <Button
              variant={pathname === '/templates' ? 'secondary' : 'ghost'}
              asChild
              className='h-auto px-2 py-1 text-sm text-gray-600 sm:px-3 sm:py-2 sm:text-base'
            >
              <Link href='/templates'>תבניות</Link>
            </Button>

            {isFirebaseLoading ? (
              <Loader2 className='h-5 w-5 animate-spin text-primary sm:h-6 sm:w-6' />
            ) : currentUser ? (
              <>
                <Button
                  variant={pathname === '/dashboard' ? 'secondary' : 'ghost'}
                  asChild
                  className='h-auto px-2 py-1 text-sm text-gray-600 sm:px-3 sm:py-2 sm:text-base'
                >
                  <Link href='/dashboard' className='flex items-center gap-1'>
                    <LayoutDashboard className='hidden h-4 w-4 sm:inline' />
                    לוח הבקרה
                  </Link>
                </Button>
                <Button
                  variant='secondary'
                  onClick={logout}
                  className='h-auto px-2 py-1 text-sm font-semibold sm:px-3 sm:py-2 sm:text-base'
                  title={`התנתק (${currentUser.displayName || currentUser.email || currentUser.phoneNumber || 'משתמש'})`}
                >
                  <LogOut className='h-4 w-4 sm:h-5 sm:w-5' />
                  <span className='hidden sm:inline'>התנתק</span>
                </Button>
              </>
            ) : (
              <Button
                variant='default'
                asChild
                className='h-auto px-3 py-1.5 text-sm font-semibold sm:px-4 sm:py-2 sm:text-base'
              >
                <Link
                  href='/login'
                  className='flex items-center gap-1 sm:gap-1.5'
                >
                  <LogIn className='h-4 w-4 sm:h-5 sm:w-5' />
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
