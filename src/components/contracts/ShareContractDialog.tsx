'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useContractAccess } from '@/hooks/useContractAccess';
import { useToast } from '@/hooks/use-toast';
import type { AccessLevel, Permission } from '@shared/types/access-control';

interface ShareContractDialogProps {
  contractId: string;
  trigger?: React.ReactNode;
  onShared?: () => void;
}

const ACCESS_LEVEL_OPTIONS: AccessLevel[] = [
  'viewer',
  'signer',
  'collaborator',
];

const PERMISSION_OPTIONS: Permission[] = [
  'view',
  'edit',
  'sign',
  'download',
  'manage',
  'comment',
  'share',
  'delete',
];

export default function ShareContractDialog({
  contractId,
  trigger,
  onShared,
}: ShareContractDialogProps) {
  const { shareContract, sharing } = useContractAccess();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('viewer');
  const [permissions, setPermissions] = useState<Permission[]>(['view']);

  const togglePermission = (perm: Permission) => {
    setPermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const handleShare = async () => {
    if (!email.trim()) return;
    try {
      await shareContract({
        contractId,
        userEmails: [email.trim()],
        accessLevel,
        permissions,
      });
      toast({ title: 'הצלחה', description: 'החוזה שותף בהצלחה.' });
      setEmail('');
      onShared?.();
    } catch (err: any) {
      toast({
        title: 'שגיאה',
        description: err?.message || 'שיתוף החוזה נכשל.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || <Button variant='secondary'>שתף חוזה</Button>}</DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>שתף חוזה</DialogTitle>
          <DialogDescription>
            הזן אימייל, בחר רמת גישה וההרשאות.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='share-email'>אימייל</Label>
            <Input
              id='share-email'
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder='user@example.com'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='access-level'>רמת גישה</Label>
            <Select
              value={accessLevel}
              onValueChange={val => setAccessLevel(val as AccessLevel)}
            >
              <SelectTrigger id='access-level'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_LEVEL_OPTIONS.map(level => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>הרשאות</Label>
            <div className='grid grid-cols-2 gap-2'>
              {PERMISSION_OPTIONS.map(p => (
                <label key={p} className='flex items-center gap-2 text-sm'>
                  <Checkbox
                    checked={permissions.includes(p)}
                    onCheckedChange={() => togglePermission(p)}
                    id={`perm-${p}`}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className='mt-4'>
          <Button onClick={handleShare} disabled={sharing || !email.trim()}>
            {sharing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            שתף
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

