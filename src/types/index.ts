
export interface User {
  uid: string; // Firebase UID
  email: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
}

export interface CustomClause {
  description: string;
  legalWording: string;
}

export interface StoredContractData {
  id: string; // Unique contract ID
  ownerId: string; // User UID of the owner
  templateId: string;
  templateName?: string;
  formData: Record<string, any>;
  customClauses: CustomClause[];
  createdAt: string;
  sharedWith?: string[]; // Array of user *emails* this contract is shared with (limitation for phone-only users)
}
