export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-secondary/50 text-secondary-foreground py-6 text-center shadow-inner">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {currentYear} חץ חוזים. כל הזכויות שמורות.
        </p>
        <p className="text-xs mt-1">
          נוצר באמצעות Firebase Studio.
        </p>
      </div>
    </footer>
  );
}
