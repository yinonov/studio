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
  id: string; 
  ownerId: string;
  templateId: string;
  title: string;
  formData: Record<string, any>;
  customClauses?: CustomClause[];
  parties?: { name: string; email: string; status: 'pending' | 'signed' }[];
  status: 'draft' | 'pending' | 'completed' | string;
  createdAt: Timestamp | Date | string;
  lastUpdatedAt: Timestamp | Date | string;
  sharedWith?: string[];
  signatureRequestId?: string;
  signingUrl?: string; // Optional URL for the embedded signing
}

export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  icon?: LucideIcon;
  fields?: { id:string; label: string; type: string; placeholder?: string; required?: boolean }[];
  defaultValues?: Record<string, string>;
  baseClauses?: string[];
}
