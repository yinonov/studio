import type { Icon } from 'lucide-react';
import { FileText, Briefcase, Home } from 'lucide-react';

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon?: Icon;
  fields: TemplateField[];
  baseClauses: string[]; // Basic structure, e.g., "This agreement is made between {{party1_name}} and {{party2_name}}."
}

export const templates: Template[] = [
  {
    id: 'rental-agreement',
    name: 'הסכם שכירות', // Rental Agreement
    description: 'חוזה שכירות סטנדרטי לנכסים בישראל. מתאים לדירות מגורים ולנכסים מסחריים קטנים.',
    icon: Home,
    fields: [
      { id: 'landlordName', label: 'שם המשכיר/ה', type: 'text', placeholder: 'ישראל ישראלי', required: true },
      { id: 'landlordId', label: 'ת.ז. המשכיר/ה', type: 'text', placeholder: '123456789', required: true },
      { id: 'tenantName', label: 'שם השוכר/ת', type: 'text', placeholder: 'משה כהן', required: true },
      { id: 'tenantId', label: 'ת.ז. השוכר/ת', type: 'text', placeholder: '987654321', required: true },
      { id: 'propertyAddress', label: 'כתובת הנכס', type: 'text', placeholder: 'רחוב הרצל 1, תל אביב', required: true },
      { id: 'rentAmount', label: 'סכום שכירות חודשי (₪)', type: 'number', placeholder: '5000', required: true },
      { id: 'startDate', label: 'תאריך תחילת שכירות', type: 'date', required: true },
      { id: 'endDate', label: 'תאריך סיום שכירות', type: 'date', required: true },
      { id: 'paymentDay', label: 'יום תשלום בחודש', type: 'number', placeholder: '1', required: true },
      { id: 'securityDeposit', label: 'סכום ערבות (₪)', type: 'number', placeholder: '10000' },
    ],
    baseClauses: [
      "שנערך ונחתם ב{{city}} ביום {{day}} לחודש {{month}} שנת {{year}}",
      "בין: {{landlordName}}, ת.ז. {{landlordId}} (להלן: \"המשכיר\")",
      "לבין: {{tenantName}}, ת.ז. {{tenantId}} (להלן: \"השוכר\")",
      "הואיל והמשכיר הינו בעל הזכויות בנכס הנמצא ברחוב {{propertyAddress}} (להלן: \"המושכר\");",
      "והואיל והשוכר מעוניין לשכור מאת המשכיר את המושכר, והמשכיר מעוניין להשכיר לשוכר את המושכר, הכל בכפוף לתנאים המפורטים בהסכם זה להלן.",
      "אי לכך הוצהר, הותנה והוסכם בין הצדדים כדלקמן:",
      "1. תקופת השכירות: תקופת השכירות תחל ביום {{startDate}} ותסתיים ביום {{endDate}} (להלן: \"תקופת השכירות\").",
      "2. דמי שכירות: השוכר ישלם למשכיר דמי שכירות חודשיים בסך {{rentAmount}} ₪. דמי השכירות ישולמו מראש בכל {{paymentDay}} לחודש.",
      "3. ערבות: להבטחת מילוי התחייבויותיו על פי הסכם זה, יפקיד השוכר בידי המשכיר ערבות בסך {{securityDeposit}} ₪.",
    ],
  },
  {
    id: 'service-agreement',
    name: 'הסכם שירותים', // Service Agreement
    description: 'חוזה למתן שירותים בין נותן שירותים (פרילנסר או חברה) ללקוח.',
    icon: Briefcase,
    fields: [
      { id: 'serviceProviderName', label: 'שם נותן השירותים', type: 'text', required: true },
      { id: 'serviceProviderId', label: 'מספר עוסק/ח.פ. נותן השירותים', type: 'text', required: true },
      { id: 'clientName', label: 'שם הלקוח', type: 'text', required: true },
      { id: 'clientId', label: 'מספר עוסק/ח.פ./ת.ז. הלקוח', type: 'text' },
      { id: 'serviceDescription', label: 'תיאור השירותים', type: 'textarea', placeholder: 'פירוט השירותים שיסופקו', required: true },
      { id: 'totalFee', label: 'תמורה כוללת (₪)', type: 'number', required: true },
      { id: 'paymentTerms', label: 'תנאי תשלום', type: 'textarea', placeholder: 'לדוגמה: 50% מקדמה, 50% בסיום הפרויקט', required: true },
      { id: 'projectTimeline', label: 'לוח זמנים', type: 'text', placeholder: 'לדוגמה: 4 שבועות מיום חתימת ההסכם' },
    ],
    baseClauses: [
      "שנערך ונחתם ב{{city}} ביום {{day}} לחודש {{month}} שנת {{year}}",
      "בין: {{serviceProviderName}}, ע.מ./ח.פ. {{serviceProviderId}} (להלן: \"נותן השירותים\")",
      "לבין: {{clientName}}, ע.מ./ח.פ./ת.ז. {{clientId}} (להלן: \"הלקוח\")",
      "הואיל ונותן השירותים עוסק במתן שירותים בתחום {{serviceDescriptionGeneralTopic}};", // Add a field for general topic?
      "והואיל והלקוח מעוניין לקבל מנותן השירותים את השירותים המפורטים להלן, ונותן השירותים מעוניין לספקם, הכל בכפוף לתנאי הסכם זה.",
      "1. מהות השירותים: נותן השירותים יספק ללקוח את השירותים הבאים: {{serviceDescription}}.",
      "2. התמורה: התמורה הכוללת עבור השירותים תהיה בסך {{totalFee}} ₪ בתוספת מע\"מ כחוק. התשלום יבוצע בהתאם לתנאים הבאים: {{paymentTerms}}.",
      "3. לוח זמנים: השירותים יסופקו בהתאם ללוח הזמנים הבא: {{projectTimeline}}.",
    ],
  },
  {
    id: 'employment-agreement',
    name: 'הסכם עבודה', // Employment Agreement
    description: 'חוזה עבודה סטנדרטי בין מעסיק לעובד, כולל סעיפים חיוניים בהתאם לחוק הישראלי.',
    icon: FileText,
    fields: [
      { id: 'employerName', label: 'שם המעסיק', type: 'text', required: true },
      { id: 'employerId', label: 'ח.פ. המעסיק', type: 'text', required: true },
      { id: 'employeeName', label: 'שם העובד/ת', type: 'text', required: true },
      { id: 'employeeId', label: 'ת.ז. העובד/ת', type: 'text', required: true },
      { id: 'jobTitle', label: 'תפקיד', type: 'text', required: true },
      { id: 'salary', label: 'שכר חודשי ברוטו (₪)', type: 'number', required: true },
      { id: 'workStartDate', label: 'תאריך תחילת עבודה', type: 'date', required: true },
      { id: 'workScope', label: 'היקף משרה (%)', type: 'number', placeholder: '100' },
      { id: 'trialPeriod', label: 'תקופת ניסיון (חודשים)', type: 'number', placeholder: '3' },
    ],
    baseClauses: [
      "שנערך ונחתם ב{{city}} ביום {{day}} לחודש {{month}} שנת {{year}}",
      "בין: {{employerName}}, ח.פ. {{employerId}} (להלן: \"המעסיק\")",
      "לבין: {{employeeName}}, ת.ז. {{employeeId}} (להלן: \"העובד\")",
      "הואיל והמעסיק מעוניין להעסיק את העובד בתפקיד {{jobTitle}}, והעובד מעוניין להיות מועסק על ידי המעסיק בתפקיד כאמור, הכל בכפוף לתנאי הסכם זה.",
      "1. תחילת עבודה ותפקיד: העובד יחל את עבודתו אצל המעסיק ביום {{workStartDate}} בתפקיד {{jobTitle}}.",
      "2. שכר ותנאים נלווים: שכרו החודשי של העובד יהיה {{salary}} ₪ ברוטו. היקף המשרה הינו {{workScope}}%.",
      "3. תקופת ניסיון: העסקת העובד כפופה לתקופת ניסיון של {{trialPeriod}} חודשים.",
    ],
  },
];

export const getTemplateById = (id: string): Template | undefined => {
  return templates.find(template => template.id === id);
};

// Helper to get current date parts for clause interpolation
export const getCurrentDateParts = () => {
  const now = new Date();
  return {
    day: now.toLocaleDateString('he-IL', { day: 'numeric' }),
    month: now.toLocaleDateString('he-IL', { month: 'long' }),
    year: now.toLocaleDateString('he-IL', { year: 'numeric' }),
    city: 'תל אביב' // Placeholder city, could be a form field
  };
};
