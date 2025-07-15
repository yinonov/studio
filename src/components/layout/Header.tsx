'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import {
  LogIn,
  LogOut,
  Loader2,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  User,
  Mail,
  Phone,
  Bug,
  ChevronDown,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { currentUser, logout, isFirebaseLoading } = useAuth();
  const { isAdmin } = useAdmin();
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
                {isAdmin && (
                  <Button
                    variant={
                      pathname.startsWith('/admin') ? 'secondary' : 'ghost'
                    }
                    asChild
                    className='h-auto px-2 py-1 text-sm text-gray-600 sm:px-3 sm:py-2 sm:text-base'
                  >
                    <Link
                      href='/admin/templates'
                      className='flex items-center gap-1'
                    >
                      <Settings className='hidden h-4 w-4 sm:inline' />
                      אדמין
                    </Link>
                  </Button>
                )}
                
                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      className='h-auto px-2 py-1 text-sm hover:bg-muted sm:px-3 sm:py-2 sm:text-base'
                    >
                      <div className='flex items-center gap-2'>
                        <User className='h-4 w-4' />
                        <span className='max-w-[100px] truncate sm:max-w-[150px]'>
                          {currentUser.displayName ||
                            currentUser.email?.split('@')[0] ||
                            currentUser.phoneNumber ||
                            'משתמש'}
                        </span>
                        <ChevronDown className='h-3 w-3' />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-64'>
                    <DropdownMenuLabel className='text-right'>
                      פרטי משתמש
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* User Details */}
                    <div className='px-2 py-2 text-sm'>
                      <div className='space-y-2'>
                        {currentUser.displayName && (
                          <div className='flex items-center gap-2'>
                            <User className='h-3 w-3 text-muted-foreground' />
                            <span className='truncate'>{currentUser.displayName}</span>
                          </div>
                        )}
                        {currentUser.email && (
                          <div className='flex items-center gap-2'>
                            <Mail className='h-3 w-3 text-muted-foreground' />
                            <span className='truncate text-xs'>{currentUser.email}</span>
                          </div>
                        )}
                        {currentUser.phoneNumber && (
                          <div className='flex items-center gap-2'>
                            <Phone className='h-3 w-3 text-muted-foreground' />
                            <span className='truncate text-xs'>{currentUser.phoneNumber}</span>
                          </div>
                        )}
                        {isAdmin && (
                          <div className='flex items-center gap-2'>
                            <ShieldCheck className='h-3 w-3 text-green-600' />
                            <Badge variant='secondary' className='text-xs'>
                              אדמין
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Debug Link */}
                    <DropdownMenuItem asChild>
                      <Link href='/debug' className='flex w-full items-center gap-2'>
                        <Bug className='h-4 w-4' />
                        מידע משתמש ואדמין
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Logout */}
                    <DropdownMenuItem
                      onClick={logout}
                      className='flex w-full items-center gap-2 text-red-600 focus:text-red-600'
                    >
                      <LogOut className='h-4 w-4' />
                      התנתק
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
