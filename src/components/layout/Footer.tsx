export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className='border-t border-gray-700 bg-gray-800 py-8 text-center text-gray-400'>
      <div className='container mx-auto px-4'>
        <p className='text-sm'>
          &copy; {currentYear} Smart Contracts IL. כל הזכויות שמורות.
        </p>
        <p className='mt-1 text-xs text-gray-500'>
          פלטפורמה ליצירה וניהול חוזים חכמים בישראל.
        </p>
      </div>
    </footer>
  );
}
