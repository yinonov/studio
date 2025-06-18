
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const { login, currentUser } = useAuth();
  const router = useRouter();

  if (currentUser) {
    router.push('/'); // Redirect if already logged in
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      login(email.trim());
      router.push('/'); // Redirect to home after login
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">התחברות</CardTitle>
          <CardDescription>הזן את כתובת האימייל שלך (לצורך הדגמה)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-md">כתובת אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-background border-input focus:border-primary focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              התחבר
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
