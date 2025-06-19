
// This component was part of the original "Chetz Contracts" structure.
// The new provided code does not include an AI Clause Generator.
// If this functionality is still desired, it would need to be integrated
// into the new `ContractCreationPage` or as a separate component called from there.
// For now, this file can be considered deprecated or removed if not used by the new structure.

'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Assuming customizeContractClause is still relevant and available
// import { customizeContractClause } from '@/ai/flows/customize-contract-clause'; 
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';

interface AiClauseGeneratorProps {
  onAddClause: (description: string, legalWording: string) => void;
}

export default function AiClauseGenerator({ onAddClause }: AiClauseGeneratorProps) {
  const [userDescription, setUserDescription] = useState('');
  const [generatedClause, setGeneratedClause] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateClause = async () => {
    if (!userDescription.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא תארו את הסעיף המבוקש.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setGeneratedClause('');
    try {
      // const result = await customizeContractClause({ userDescription });
      // setGeneratedClause(result.legalWording);
      // Mocking AI response for now as customizeContractClause might not be set up
      setGeneratedClause(`ניסוח משפטי לדוגמה עבור: "${userDescription}". זהו טקסט פלייסהולדר.`);
       toast({ title: 'הדגמה', description: 'סעיף נוצר (הדגמה).', variant: 'default' });
    } catch (error) {
      console.error("AI clause generation error:", error);
      toast({
        title: 'שגיאה ביצירת סעיף',
        description: 'לא ניתן היה ליצור את הסעיף המבוקש. אנא נסו שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClauseToContract = () => {
    if (generatedClause && userDescription) {
      onAddClause(userDescription, generatedClause);
      setGeneratedClause('');
      setUserDescription(''); 
      toast({
        title: 'הצלחה',
        description: 'הסעיף המותאם אישית נוסף לחוזה.',
      });
    }
  };

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-2xl font-headline text-primary-foreground/90">הוספת סעיף מותאם אישית (AI)</CardTitle>
        <CardDescription className="text-muted-foreground">
          (הדגמה) תארו בשפה פשוטה את הסעיף, והמערכת תיצור ניסוח משפטי.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div>
          <Label htmlFor="clauseDescription" className="text-md font-medium text-foreground/80">תיאור הסעיף:</Label>
          <Textarea
            id="clauseDescription"
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            placeholder="לדוגמה: איסור על הכנסת בעלי חיים..."
            rows={3}
            className="mt-1"
          />
        </div>
        <Button onClick={handleGenerateClause} disabled={isLoading || !userDescription.trim()} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isLoading ? 'יוצר סעיף...' : 'צור סעיף (הדגמה)'}
        </Button>
        
        {generatedClause && (
          <div className="mt-4 p-4 border border-dashed border-accent rounded-md bg-accent/5">
            <Label className="text-md font-medium text-foreground/80">הסעיף שנוצר:</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{generatedClause}</p>
          </div>
        )}
      </CardContent>
      {generatedClause && (
        <CardFooter className="p-6">
          <Button onClick={handleAddClauseToContract} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            הוסף סעיף זה לחוזה
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
