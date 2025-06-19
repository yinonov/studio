
export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-secondary/30 text-secondary-foreground py-8 text-center border-t">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {currentYear} Smart Contracts IL. כל הזכויות שמורות.
        </p>
         <p className="text-xs mt-1 text-muted-foreground">
          פלטפורמה ליצירה וניהול חוזים חכמים בישראל.
        </p>
      </div>
    </footer>
  );
}
