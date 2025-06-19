
'use client';

import { useEffect, useState } from 'react';
import TemplateCard from '@/components/contracts/TemplateCard';
import { fetchTemplates } from '@/firebase/templateServices';
import type { Template } from '@/types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTemplates = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const templatesData = await fetchTemplates();
                setTemplates(templatesData);
            } catch (err: any) {
                console.error("Error fetching templates: ", err);
                setError("שגיאה בטעינת התבניות. נסה לרענן את הדף.");
            } finally {
                setIsLoading(false);
            }
        };
        loadTemplates();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-300px)]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">טוען תבניות...</p>
            </div>
        );
    }

    return (
        <section className="space-y-10 md:space-y-12">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground/90">
                    ספריית תבניות החוזים
                </h1>
                <p className="mt-3 md:mt-4 max-w-2xl mx-auto text-md md:text-lg text-muted-foreground">
                    מצא/י את התבנית המשפטית המושלמת לצרכים שלך. כל התבניות מותאמות לשוק הישראלי.
                </p>
            </div>

            {error && (
                <div className="text-center p-4 bg-destructive/10 text-destructive rounded-md">
                    <p>{error}</p>
                    <Button onClick={() => window.location.reload()} variant="link" className="text-destructive">
                        נסה לרענן
                    </Button>
                </div>
            )}

            {!error && templates.length === 0 && (
                 <div className="text-center py-12">
                    <p className="text-xl text-muted-foreground mb-6">לא נמצאו תבניות זמינות כרגע. ייתכן שעדיין לא הוספנו תבניות למערכת.</p>
                     <Button asChild>
                        <Link href="/dashboard">חזור ללוח הבקרה</Link>
                    </Button>
                </div>
            )}

            {!error && templates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {templates.map((template) => (
                        <TemplateCard key={template.id} template={template} />
                    ))}
                </div>
            )}
        </section>
    );
}
