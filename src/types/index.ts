
import type { Timestamp } from 'firebase/firestore';
import type { LucideIcon } from 'lucide-react';

export interface User {
  uid: string; // Firebase UID
  email: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  subscriptionTier?: 'free' | 'premium'; // Example field
  createdAt?: Timestamp;
}

export interface CustomClause {
  description: string;
  legalWording: string;
}

export interface StoredContractData {
  id: string; // Unique contract ID from Firestore
  ownerId: string; // User UID of the owner
  templateId: string;
  title?: string; // Was templateName
  formData: Record<string, any>;
  customClauses?: CustomClause[]; // Make optional if not always present
  parties?: { name: string; email: string }[];
  status?: 'draft' | 'pending' | 'completed' | string; // Allow for other statuses
  createdAt: Timestamp | Date | string; // Firestore timestamp, Date object or ISO string
  lastUpdatedAt?: Timestamp | Date | string;
  sharedWith?: string[];
  signingUrl?: string; // If you store this
}

export interface Template {
  id: string;
  title: string; // Was name
  category: string;
  description: string;
  icon?: LucideIcon | React.ReactElement; // Allow for JSX elements for icons
  fields?: { id: string; label: string; type: string; placeholder?: string; required?: boolean }[]; // From old structure, might be part of template doc
  baseClauses?: string[]; // From old structure
}
