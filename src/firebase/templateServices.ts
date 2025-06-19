
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Template } from '@/types';
import { Building, Handshake, ShieldCheck, FileText } from 'lucide-react'; // Default icons

// Helper to assign icons - this part is illustrative as icon components can't be directly stored in Firestore
// You'd typically store a string key and map it to the component on the client.
const getIconForCategory = (category: string) => {
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

const defaultTemplates: Template[] = [
  { 
    id: 'lease-residential', 
    title: "הסכם שכירות דירה", 
    category: "נדל\"ן", 
    description: "חוזה סטנדרטי למשכירים ושוכרים.",
    // icon: getIconForCategory('נדל"ן'), // This is illustrative; assign component in client
    // Fields and baseClauses would be part of the Firestore document for 'lease-residential'
  },
  { 
    id: 'service-freelance', 
    title: "הסכם שירותי פרילנס", 
    category: "שירותים", 
    description: "חוזה לפרילנסרים המספקים שירותים.",
    // icon: getIconForCategory('שירותים'),
  },
  { 
    id: 'nda', 
    title: "הסכם סודיות (NDA)", 
    category: "עסקי", 
    description: "הסכם לשמירה על מידע רגיש.",
    // icon: getIconForCategory('עסקי'),
  },
];

export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "templates"));
    if (querySnapshot.empty) {
      // If Firestore is empty, return local defaults (consider seeding Firestore instead)
      // console.warn("No templates found in Firestore, returning local defaults. Consider seeding your database.");
      // For the purpose of this refactor, we'll return defaults with client-side icon mapping
      return defaultTemplates.map(t => ({...t, icon: getIconForCategory(t.category)}));
    }
    const templatesData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        icon: getIconForCategory(data.category), // Assign icon on client
      } as Template;
    });
    return templatesData;
  } catch (error) {
    console.error("Error fetching templates: ", error);
    // Fallback to default templates on error, or handle error differently
    return defaultTemplates.map(t => ({...t, icon: getIconForCategory(t.category)}));
  }
};

export const fetchTemplateById = async (templateId: string): Promise<Template | null> => {
  try {
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
      console.warn(`Template with id ${templateId} not found.`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching template by ID: ", error);
    return null;
  }
};
