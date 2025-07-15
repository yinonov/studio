import { httpsCallable } from 'firebase/functions';
import { getClientFunctions } from '@/lib/firebase';
import type { Template, TemplateField } from '@/types';

export interface CreateTemplateData {
  title: string;
  category: string;
  description: string;
  fields: TemplateField[];
  baseClauses: string[];
  defaultValues?: Record<string, string>;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id: string;
}

/**
 * Create a new template using Firebase Admin SDK
 */
export const createTemplate = async (
  templateData: CreateTemplateData
): Promise<string> => {
  try {
    const functions = getClientFunctions();
    const createTemplateFn = httpsCallable(functions, 'createTemplate');
    
    const result = await createTemplateFn(templateData);
    const data = result.data as { templateId: string };
    
    return data.templateId;
  } catch (error) {
    console.error('Error creating template:', error);
    throw new Error('Failed to create template');
  }
};

/**
 * Update an existing template using Firebase Admin SDK
 */
export const updateTemplate = async (
  templateData: UpdateTemplateData
): Promise<void> => {
  try {
    const functions = getClientFunctions();
    const updateTemplateFn = httpsCallable(functions, 'updateTemplate');
    
    await updateTemplateFn(templateData);
  } catch (error) {
    console.error('Error updating template:', error);
    throw new Error('Failed to update template');
  }
};

/**
 * Delete a template using Firebase Admin SDK
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    const functions = getClientFunctions();
    const deleteTemplateFn = httpsCallable(functions, 'deleteTemplate');
    
    await deleteTemplateFn({ templateId });
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('Failed to delete template');
  }
};

/**
 * Get all templates for admin management using Firebase Admin SDK
 */
export const fetchAllTemplatesForAdmin = async (): Promise<
  (Template & {
    createdAt?: Date;
    lastUpdatedAt?: Date;
  })[]
> => {
  try {
    const functions = getClientFunctions();
    const getAllTemplatesFn = httpsCallable(
      functions,
      'getAllTemplatesForAdmin'
    );
    
    const result = await getAllTemplatesFn();
    const data = result.data as {
      templates: (Template & {
        createdAt?: Date;
        lastUpdatedAt?: Date;
      })[];
    };
    
    return data.templates;
  } catch (error) {
    console.error('Error fetching templates for admin:', error);
    throw new Error('Failed to fetch templates');
  }
};

/**
 * Sync default templates to Firestore using Firebase Admin SDK
 */
export const syncDefaultTemplatesToFirestore = async (): Promise<number> => {
  try {
    const functions = getClientFunctions();
    const syncDefaultTemplatesFn = httpsCallable(
      functions,
      'syncDefaultTemplates'
    );
    
    const result = await syncDefaultTemplatesFn();
    const data = result.data as { syncedCount: number };
    
    console.log(`Synced ${data.syncedCount} default templates to Firestore`);
    return data.syncedCount;
  } catch (error) {
    console.error('Error syncing default templates:', error);
    throw new Error('Failed to sync default templates');
  }
};
