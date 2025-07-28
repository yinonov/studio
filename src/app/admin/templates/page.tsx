'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import {
  fetchAllTemplatesForAdmin,
  deleteTemplate,
  syncDefaultTemplatesToFirestore,
} from '@/firebase/adminTemplateServices';
import type { Template } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type AdminTemplate = Template & {
  createdAt?: any;
  lastUpdatedAt?: any;
};

export default function AdminTemplatesPage() {
  const { currentUser, isFirebaseLoading } = useAuth();
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const templatesData = await fetchAllTemplatesForAdmin();
      setTemplates(templatesData);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('שגיאה בטעינת התבניות');
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לטעון את התבניות',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isFirebaseLoading || isCheckingAdmin) return;

    if (!currentUser) {
      router.push('/login?redirect=/admin/templates');
      return;
    }

    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    loadTemplates();
  }, [
    currentUser,
    isFirebaseLoading,
    isAdmin,
    isCheckingAdmin,
    router,
    loadTemplates,
  ]);

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setDeletingId(templateId);
      await deleteTemplate(templateId);

      // Remove from local state
      setTemplates(templates.filter(t => t.id !== templateId));

      toast({
        title: 'התבנית נמחקה',
        description: 'התבנית נמחקה בהצלחה',
      });
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה למחוק את התבנית',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncDefaultTemplates = async () => {
    try {
      setIsSyncing(true);
      const syncedCount = await syncDefaultTemplatesToFirestore();

      toast({
        title: 'סנכרון הושלם',
        description: `${syncedCount} תבניות ברירת מחדל נוספו בהצלחה`,
      });

      // Reload templates to show the new ones
      await loadTemplates();
    } catch (err) {
      console.error('Error syncing templates:', err);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן היה לסנכרן תבניות ברירת המחדל',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'd בMMMM yyyy, HH:mm', { locale: he });
    } catch {
      return 'תאריך לא תקין';
    }
  };

  if (isFirebaseLoading || (!currentUser && !isFirebaseLoading)) {
    return (
      <div className='flex min-h-[calc(100vh-200px)] items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className='py-10 text-center'>
        <p className='text-xl text-destructive'>אין לך הרשאות אדמין</p>
        <Button onClick={() => router.push('/dashboard')} className='mt-4'>
          חזור לדף הבית
        </Button>
      </div>
    );
  }

  return (
    <section className='space-y-8'>
      <div className='flex items-center gap-4'>
        <Button
          onClick={() => router.push('/dashboard')}
          variant='ghost'
          className='flex items-center font-semibold text-gray-600 hover:text-accent-foreground'
        >
          <ChevronRight className='ml-1 h-5 w-5' />
          חזור לדף הבית
        </Button>
      </div>

      <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
        <div>
          <h1 className='text-3xl font-extrabold text-gray-900 md:text-4xl'>
            ניהול תבניות (אדמין)
          </h1>
          <p className='mt-2 text-muted-foreground'>
            ניהול תבניות חוזים במערכת
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={() => router.push('/admin/templates/create')}
            size='lg'
          >
            <Plus className='ml-2 h-5 w-5' />
            צור תבנית חדשה
          </Button>
          <Button
            onClick={handleSyncDefaultTemplates}
            variant='outline'
            size='lg'
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className='ml-2 h-5 w-5 animate-spin' />
            ) : (
              <RefreshCw className='ml-2 h-5 w-5' />
            )}
            {isSyncing ? 'מסנכרן...' : 'סנכרן תבניות ברירת מחדל'}
          </Button>
        </div>
      </div>

      <Card className='rounded-2xl shadow-lg'>
        <CardHeader>
          <CardTitle className='text-2xl font-bold text-gray-900'>
            תבניות קיימות
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className='flex items-center justify-center py-10'>
              <Loader2 className='h-10 w-10 animate-spin text-primary' />
              <p className='ml-3 text-muted-foreground'>טוען תבניות...</p>
            </div>
          )}

          {error && (
            <p className='py-10 text-center text-destructive'>{error}</p>
          )}

          {!isLoading && !error && templates.length === 0 && (
            <div className='py-10 text-center'>
              <FileText className='mx-auto h-16 w-16 text-muted-foreground' />
              <p className='mt-4 text-xl text-muted-foreground'>
                עדיין לא נוצרו תבניות
              </p>
              <Button
                onClick={() => router.push('/admin/templates/create')}
                variant='outline'
                className='mt-4'
              >
                <Plus className='ml-2 h-4 w-4' />
                צור תבנית ראשונה
              </Button>
            </div>
          )}

          {!isLoading && !error && templates.length > 0 && (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='text-right'>כותרת</TableHead>
                    <TableHead className='text-right'>קטגוריה</TableHead>
                    <TableHead className='text-right'>תיאור</TableHead>
                    <TableHead className='text-right'>שדות</TableHead>
                    <TableHead className='text-right'>עדכון אחרון</TableHead>
                    <TableHead className='text-center'>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(template => (
                    <TableRow
                      key={template.id}
                      className='cursor-pointer hover:bg-muted/50'
                    >
                      <TableCell className='font-medium'>
                        {template.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary'>{template.category}</Badge>
                      </TableCell>
                      <TableCell className='max-w-xs truncate text-gray-600'>
                        {template.description}
                      </TableCell>
                      <TableCell className='text-gray-600'>
                        {template.fields?.length || 0} שדות
                      </TableCell>
                      <TableCell className='text-gray-600'>
                        {formatDate(template.lastUpdatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center justify-center gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() =>
                              router.push(
                                `/admin/templates/edit/${template.id}`
                              )
                            }
                          >
                            <Edit className='h-4 w-4' />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='outline'
                                size='sm'
                                disabled={deletingId === template.id}
                              >
                                {deletingId === template.id ? (
                                  <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                  <Trash2 className='h-4 w-4' />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>מחיקת תבנית</AlertDialogTitle>
                                <AlertDialogDescription>
                                  האם אתה בטוח שברצונך למחוק את התבנית "
                                  {template.title}"? פעולה זו אינה ניתנת לביטול.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ביטול</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteTemplate(template.id)
                                  }
                                  className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                >
                                  מחק
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
