
// This file is no longer the primary source for templates if fetching from Firestore.
// It can be kept for local fallback or removed if templates are solely managed in Firestore.
// For this refactor, assuming Firestore is the source of truth.

import type { Icon } from 'lucide-react';
import { FileText, Home } from 'lucide-react';

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  name: string; // Corresponds to 'title' in new structure
  description: string;
  icon?: Icon;
  category?: string; // Added for consistency with new structure
  fields: TemplateField[];
  baseClauses: string[]; 
}

// This data is now for reference or local fallback.
// The main template data should be in Firestore.
export const localFallbackTemplates: Template[] = [
  {
    id: 'rental-agreement-local',
    name: 'הסכם שכירות (מקומי)',
    category: "נדל\"ן",
    description: 'חוזה שכירות סטנדרטי לנכסים בישראל.',
    icon: Home,
    fields: [
      { id: 'landlordName', label: 'שם המשכיר/ה', type: 'text', placeholder: 'ישראל ישראלי', required: true },
      { id: 'tenantName', label: 'שם השוכר/ת', type: 'text', placeholder: 'משה כהן', required: true },
    ],
    baseClauses: [
      "שנערך ונחתם ב{{city}} ביום {{day}} לחודש {{month}} שנת {{year}}",
      "בין: {{landlordName}} לבין: {{tenantName}}.",
    ],
  },
];

export const getLocalTemplateById = (id: string): Template | undefined => {
  return localFallbackTemplates.find(template => template.id === id);
};

export const getCurrentDateParts = () => {
  const now = new Date();
  return {
    day: now.toLocaleDateString('he-IL', { day: 'numeric' }),
    month: now.toLocaleDateString('he-IL', { month: 'long' }),
    year: now.toLocaleDateString('he-IL', { year: 'numeric' }),
    city: 'תל אביב' 
  };
};
