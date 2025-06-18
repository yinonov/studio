import TemplateCard from '@/components/contract/TemplateCard';
import { templates } from '@/data/templates';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TemplateLibraryPage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-8 bg-primary/5 rounded-xl shadow-md">
        <h1 className="text-4xl font-bold mb-4 text-primary-foreground/90">מאגר תבניות החוזים</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          בחרו תבנית חוזה מתוך המאגר המגוון שלנו, המותאם במיוחד לצרכים המשפטיים והעסקיים בישראל. כל התבניות נכתבו ונבדקו על ידי מומחים משפטיים.
        </p>
      </section>
      
      <section>
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">לא נמצאו תבניות זמינות כרגע. נסו שוב מאוחר יותר.</p>
          </div>
        )}
      </section>
    </div>
  );
}
