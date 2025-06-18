import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Edit3, FileText, Users, ShieldCheck, Brain } from 'lucide-react';
import Image from 'next/image';

const features = [
  {
    icon: <FileText className="w-12 h-12 text-primary" />,
    title: 'מאגר תבניות עשיר',
    description: 'תבניות חוזים מוכנות לשימוש, מותאמות לחוק הישראלי: הסכמי שכירות, שירותים, העסקה ועוד.',
  },
  {
    icon: <Edit3 className="w-12 h-12 text-primary" />,
    title: 'יצירה מודרכת ופשוטה',
    description: 'אשף חכם וידידותי ילווה אתכם צעד אחר צעד ביצירת החוזה, בשפה פשוטה וברורה.',
  },
  {
    icon: <Brain className="w-12 h-12 text-primary" />,
    title: 'התאמה אישית חכמה (AI)',
    description: 'הוסיפו סעיפים מותאמים אישית לחוזה על ידי תיאור הצרכים שלכם בשפה חופשית.',
  },
  {
    icon: <ShieldCheck className="w-12 h-12 text-primary" />,
    title: 'חתימות דיגיטליות מאובטחות',
    description: 'חתמו ושלחו חוזים לחתימה באופן דיגיטלי, מאובטח ובעל תוקף משפטי.',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20 bg-gradient-to-b from-primary/5 to-background rounded-xl shadow-lg">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-primary-foreground/90">
            יצירת חוזים חכמים בישראל. <span className="text-accent">בקלות ובמהירות.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            חץ חוזים מאפשר לכם ליצור חוזים משפטיים תקינים ומותאמים אישית תוך דקות, ללא צורך בידע משפטי מוקדם או עלויות גבוהות.
          </p>
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md transition-transform hover:scale-105">
            <Link href="/templates">התחילו ליצור חוזה</Link>
          </Button>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-primary-foreground/80">
            למה לבחור ב<span className="text-primary">חץ חוזים</span>?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-2xl">מומחיות מקומית</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">חוזים שנבנו במיוחד עבור החוק והפרקטיקה העסקית בישראל.</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <Users className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <CardTitle className="text-2xl">עברית כשפת אם</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">ממשק מלא בעברית, כולל תמיכה מימין לשמאל וטיפוגרפיה מותאמת.</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <CardTitle className="text-2xl">שיפור באמצעות AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">התאימו תבניות סטנדרטיות לצרכים הייחודיים שלכם בקלות.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 bg-primary/5 rounded-xl">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-primary-foreground/80">
            כל מה שצריך ליצירת חוזים מושלמים
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="mb-4 flex justify-center">{feature.icon}</div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="text-center py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground/80">
            מוכנים להתחיל?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            הצטרפו לאלפי עסקים ואנשים פרטיים שכבר נהנים מיצירת חוזים פשוטה, מהירה ובטוחה.
          </p>
          <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md transition-transform hover:scale-105">
            <Link href="/templates">גלו את מאגר התבניות שלנו</Link>
          </Button>
        </div>
      </section>

      {/* Placeholder for illustration/image */}
      <section className="py-12">
        <div className="container mx-auto px-6 flex justify-center">
          <Image 
            src="https://placehold.co/800x400.png" 
            alt="איור של תהליך יצירת חוזה" 
            width={800} 
            height={400}
            data-ai-hint="contract creation process"
            className="rounded-lg shadow-xl"
          />
        </div>
      </section>
    </div>
  );
}
