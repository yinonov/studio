
export interface User {
  id: string; // For mock purposes, this can be the email
  email: string;
}

export interface CustomClause {
  description: string;
  legalWording: string;
}

export interface StoredContractData {
  id: string; // Unique contract ID
  ownerId: string; // User ID of the owner
  templateId: string;
  templateName?: string;
  formData: Record<string, any>;
  customClauses: CustomClause[];
  createdAt: string;
  // sharedWith?: string[]; // For future sharing feature - not implemented in this step
}
