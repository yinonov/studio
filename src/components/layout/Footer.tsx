
export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-800 text-gray-400 py-8 text-center border-t border-gray-700">
      <div className="container mx-auto px-4">
        <p className="text-sm">
          &copy; {currentYear} Smart Contracts IL. כל הזכויות שמורות.
        </p>
         <p className="text-xs mt-1 text-gray-500">
          פלטפורמה ליצירה וניהול חוזים חכמים בישראל.
        </p>
      </div>
    </footer>
  );
}
