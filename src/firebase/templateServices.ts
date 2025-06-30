
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import type { Template, TemplateField } from '@/types'; // Updated to import TemplateField
import { Building, Handshake, ShieldCheck, FileText } from 'lucide-react'; // Default icons

// Helper to assign icons
const getIconForCategory = (category?: string) => { // Made category optional for safety
  switch (category?.toLowerCase()) {
    case 'נדל"ן':
    case 'real estate':
      return Building;
    case 'שירותים':
    case 'services':
      return Handshake;
    case 'עסקי':
    case 'business':
      return ShieldCheck;
    default:
      return FileText;
  }
};

// Define some basic fields for default templates
const defaultRentalFields: TemplateField[] = [
  { id: 'party1Name', label: "שם צד א' (משכיר)", type: 'text', placeholder: 'ישראל ישראלי', required: true },
  { id: 'party1Email', label: "אימייל צד א'", type: 'email', placeholder: 'israel@example.com', required: true },
  { id: 'party2Name', label: "שם צד ב' (שוכר)", type: 'text', placeholder: 'שרה לוי', required: true },
  { id: 'party2Email', label: "אימייל צד ב'", type: 'email', placeholder: 'sarah@example.com', required: true },
  { id: 'address', label: 'כתובת הנכס', type: 'text', placeholder: 'הרצל 1, תל אביב', required: true },
  { id: 'rentAmount', label: 'סכום שכירות חודשי (₪)', type: 'number', placeholder: '5000', required: true },
  { id: 'startDate', label: 'תאריך תחילת שכירות', type: 'date', required: true },
  { id: 'additionalNotes', label: 'הערות נוספות', type: 'textarea', placeholder: 'פרטים נוספים או סעיפים מיוחדים...', required: false },
];

const defaultServiceFields: TemplateField[] = [
  { id: 'party1Name', label: "שם נותן השירות", type: 'text', required: true },
  { id: 'party1Email', label: "אימייל נותן השירות", type: 'email', required: true },
  { id: 'party2Name', label: "שם מקבל השירות", type: 'text', required: true },
  { id: 'party2Email', label: "אימייל מקבל השירות", type: 'email', required: true },
  { id: 'serviceDescription', label: 'תיאור השירות', type: 'textarea', required: true },
  { id: 'serviceFee', label: 'תמורה (₪)', type: 'number', required: true },
];


const defaultTemplates: Template[] = [
  {
    id: 'lease-residential',
    title: "הסכם שכירות דירה",
    category: "נדל\"ן",
    description: "חוזה סטנדרטי למשכירים ושוכרים למגורים.",
    fields: defaultRentalFields,
    baseClauses: [ // Example base clauses
        "שנערך ונחתם ב{{city||תל אביב}} ביום {{day}} לחודש {{month}} שנת {{year}}",
        "בין: {{party1Name}} (ת.ז. __________) מצד אחד",
        "לבין: {{party2Name}} (ת.ז. __________) מצד שני",
        "הואיל והמשכיר הינו בעל הזכויות בנכס הנמצא בכתובת: {{address}} (להלן: \"המושכר\").",
        "והואיל והשוכר מעוניין לשכור מאת המשכיר את המושכר לתקופה ובתנאים המפורטים להלן.",
        "והואיל והצדדים מסכימים כי דמי השכירות החודשיים יעמדו על סך {{rentAmount}} ש\"ח.",
        "והואיל ותקופת השכירות תחל ביום {{startDate}}."
      ]
  },
  {
    id: 'service-freelance',
    title: "הסכם שירותי פרילנס",
    category: "שירותים",
    description: "חוזה לפרילנסרים המספקים שירותים ללקוחות.",
    fields: defaultServiceFields,
    baseClauses: [
        "שנערך ונחתם ביום {{day}} לחודש {{month}} שנת {{year}}",
        "בין: {{party1Name}} (להלן: \"נותן השירותים\")",
        "לבין: {{party2Name}} (להלן: \"מקבל השירותים\")",
        "הואיל ונותן השירותים עוסק במתן שירותי {{serviceDescription}}.",
        "והואיל ומקבל השירותים מעוניין לקבל מנותן השירותים את השירותים כאמור.",
        "הצדדים הסכימו כי התמורה עבור השירותים תעמוד על {{serviceFee}} ש\"ח."
      ]
  },
  {
    id: 'nda',
    title: "הסכם סודיות (NDA)",
    category: "עסקי",
    description: "הסכם לשמירה על מידע רגיש בין צדדים.",
    fields: [
      { id: 'disclosingParty', label: 'צד מגלה מידע', type: 'text', required: true },
      { id: 'receivingParty', label: 'צד מקבל מידע', type: 'text', required: true },
      { id: 'effectiveDate', label: 'תאריך תחולה', type: 'date', required: true },
      { id: 'confidentialInformationDescription', label: 'תיאור המידע הסודי', type: 'textarea', required: true },
    ],
     baseClauses: [
        "שנערך ונחתם ביום {{effectiveDate}}",
        "בין: {{disclosingParty}} (להלן: \"הצד המגלה\")",
        "לבין: {{receivingParty}} (להלן: \"הצד המקבל\")",
        "הואיל והצד המגלה מתכוון לגלות לצד המקבל מידע סודי (כהגדרתו להלן) למטרת {{purpose||בחינת שיתוף פעולה עסקי}}.",
        "להלן תיאור המידע הסודי: {{confidentialInformationDescription}}"
      ]
  },
];

export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const db = getClientDb();
    const querySnapshot = await getDocs(collection(db, "templates"));
    if (querySnapshot.empty) {
      return defaultTemplates.map(t => ({...t, icon: getIconForCategory(t.category)}));
    }
    const templatesData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        icon: getIconForCategory(data.category),
      } as Template;
    });
    return templatesData;
  } catch (error) {
    console.error("Error fetching templates: ", error);
    return defaultTemplates.map(t => ({...t, icon: getIconForCategory(t.category)}));
  }
};

export const fetchTemplateById = async (templateId: string): Promise<Template | null> => {
  try {
    const db = getClientDb();
    const templateRef = doc(db, "templates", templateId);
    const docSnap = await getDoc(templateRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        icon: getIconForCategory(data.category),
      } as Template;
    } else {
      // Fallback to local defaultTemplates if not found in Firestore
      const localTemplate = defaultTemplates.find(t => t.id === templateId);
      if (localTemplate) {
        console.warn(`Template with id ${templateId} not found in Firestore, using local fallback.`);
        return { ...localTemplate, icon: getIconForCategory(localTemplate.category) };
      }
      console.warn(`Template with id ${templateId} not found in Firestore or local fallbacks.`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching template by ID: ", error);
    // Attempt fallback in case of error too, though less likely to be the desired outcome
    const localTemplateOnError = defaultTemplates.find(t => t.id === templateId);
    if (localTemplateOnError) {
        console.warn(`Error fetching template ${templateId} from Firestore, using local fallback due to error.`);
        return { ...localTemplateOnError, icon: getIconForCategory(localTemplateOnError.category) };
    }
    return null;
  }
};


    
