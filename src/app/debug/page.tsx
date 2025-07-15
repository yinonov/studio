'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  ShieldX,
  User,
  Mail,
  Phone,
  Calendar,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { makeInitialAdmin } from '@/firebase/adminUserServices';
import { useToast } from '@/hooks/use-toast';

export default function DebugPage() {
  const { currentUser, isFirebaseLoading } = useAuth();
  const { isAdmin, isCheckingAdmin, refreshAdminStatus } = useAdmin();
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isSettingAdmin, setIsSettingAdmin] = useState(false);
  const { toast } = useToast();

  const handleMakeAdmin = async () => {
    if (!currentUser?.email) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצא אימייל משתמש',
        variant: 'destructive',
      });
      return;
    }

    if (confirmEmail !== currentUser.email) {
      toast({
        title: 'שגיאה',
        description: 'האימייל אינו תואם',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingAdmin(true);
    try {
      const result = await makeInitialAdmin(confirmEmail);
      toast({
        title: 'הצלחה!',
        description: (result as any)?.message || 'הרשאות אדמין הוגדרו בהצלחה',
        variant: 'default',
      });

      // Refresh admin status
      await refreshAdminStatus();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה בהגדרת הרשאות אדמין',
        variant: 'destructive',
      });
    } finally {
      setIsSettingAdmin(false);
      setConfirmEmail('');
    }
  };

  if (isFirebaseLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent'></div>
          <p>טוען מידע משתמש...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle className='text-center'>לא מחובר</CardTitle>
          </CardHeader>
          <CardContent className='text-center'>
            <p className='mb-4'>עליך להתחבר כדי לראות מידע זה</p>
            <Button onClick={() => router.push('/login')}>התחבר</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-4xl px-4 py-8'>
      <div className='space-y-6'>
        <div className='text-center'>
          <h1 className='mb-2 text-3xl font-bold'>מידע משתמש ואדמין</h1>
          <p className='text-muted-foreground'>
            עמוד זה מציג מידע על המשתמש הנוכחי ומצב האדמין
          </p>
        </div>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <User className='h-5 w-5' />
              מידע משתמש
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <User className='h-4 w-4 text-muted-foreground' />
                  <span className='font-medium'>שם:</span>
                  <span>{currentUser.displayName || 'לא הוגדר'}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-muted-foreground' />
                  <span className='font-medium'>אימייל:</span>
                  <span>{currentUser.email || 'לא הוגדר'}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Phone className='h-4 w-4 text-muted-foreground' />
                  <span className='font-medium'>טלפון:</span>
                  <span>{currentUser.phoneNumber || 'לא הוגדר'}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-muted-foreground' />
                  <span className='font-medium'>תאריך יצירה:</span>
                  <span>
                    {currentUser.createdAt
                      ? new Date(
                          currentUser.createdAt.toDate?.() ||
                            currentUser.createdAt
                        ).toLocaleDateString('he-IL')
                      : 'לא זמין'}
                  </span>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>UID:</span>
                  <span className='rounded bg-muted px-2 py-1 font-mono text-sm'>
                    {currentUser.uid}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <span className='font-medium'>אימייל מאומת:</span>
                  <Badge variant='outline'>לא זמין</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Status */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              {isAdmin ? (
                <ShieldCheck className='h-5 w-5 text-green-600' />
              ) : (
                <ShieldX className='h-5 w-5 text-red-600' />
              )}
              מצב אדמין
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='font-medium'>סטטוס אדמין:</span>
              <div className='flex items-center gap-2'>
                {isCheckingAdmin ? (
                  <Badge variant='outline'>בודק...</Badge>
                ) : (
                  <Badge
                    variant={isAdmin ? 'default' : 'secondary'}
                    className={isAdmin ? 'bg-green-600' : ''}
                  >
                    {isAdmin ? 'אדמין' : 'משתמש רגיל'}
                  </Badge>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
                <h4 className='mb-2 font-medium text-green-800'>
                  גישה לאדמין זמינה!
                </h4>
                <p className='mb-3 text-sm text-green-700'>
                  יש לך הרשאות אדמין. תוכל לגשת לניהול תבניות ומשתמשים.
                </p>
                <Button
                  onClick={() => router.push('/admin/templates')}
                  className='bg-green-600 hover:bg-green-700'
                >
                  עבור לניהול תבניות
                </Button>
              </div>
            )}

            {!isAdmin && !isCheckingAdmin && (
              <div className='rounded-lg border border-orange-200 bg-orange-50 p-4'>
                <h4 className='mb-2 font-medium text-orange-800'>
                  אין הרשאות אדמין
                </h4>
                <p className='mb-3 text-sm text-orange-700'>
                  אין לך הרשאות אדמין כרגע. אם אתה צריך גישה לניהול המערכת, פנה
                  למנהל המערכת.
                </p>
                <Button
                  onClick={refreshAdminStatus}
                  variant='outline'
                  disabled={isCheckingAdmin}
                >
                  בדוק שוב
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Setup Section */}
        {!isAdmin && !isCheckingAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                הגדרת הרשאות אדמין
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
                <h4 className='mb-2 font-medium text-blue-800'>
                  הפיכה לאדמין ראשוני
                </h4>
                <p className='mb-3 text-sm text-blue-700'>
                  אם אתה הראשון להתחבר למערכת, תוכל להפוך את עצמך לאדמין. הזן את
                  האימייל שלך לאישור.
                </p>
                <div className='space-y-3'>
                  <div>
                    <Label htmlFor='confirmEmail'>אימייל לאישור:</Label>
                    <Input
                      id='confirmEmail'
                      type='email'
                      value={confirmEmail}
                      onChange={e => setConfirmEmail(e.target.value)}
                      placeholder={currentUser?.email || 'הזן אימייל'}
                      disabled={isSettingAdmin}
                    />
                  </div>
                  <Button
                    onClick={handleMakeAdmin}
                    disabled={
                      isSettingAdmin ||
                      !confirmEmail ||
                      confirmEmail !== currentUser?.email
                    }
                    className='w-full'
                  >
                    {isSettingAdmin ? 'מגדיר הרשאות...' : 'הפוך לאדמין'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>ניווט</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' onClick={() => router.push('/')}>
                דף הבית
              </Button>
              <Button
                variant='outline'
                onClick={() => router.push('/dashboard')}
              >
                לוח הבקרה
              </Button>
              <Button
                variant='outline'
                onClick={() => router.push('/templates')}
              >
                תבניות
              </Button>
              {isAdmin && (
                <Button
                  variant='outline'
                  onClick={() => router.push('/admin/templates')}
                >
                  ניהול תבניות (אדמין)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
