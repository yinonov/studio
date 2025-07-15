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

// Create a new template via Cloud Function
export const createTemplate = async (
  templateData: CreateTemplateData
): Promise<string> => {
  try {
    const functions = getClientFunctions();
    const createTemplateFn = httpsCallable<
      CreateTemplateData,
      { templateId: string }
    >(functions, 'createTemplate');

    const result = await createTemplateFn(templateData);
    return result.data.templateId;
  } catch (error: any) {
    console.error('Error creating template:', error);
    throw new Error(error?.message || 'Failed to create template');
  }
};

// Update an existing template via Cloud Function
export const updateTemplate = async (
  templateData: UpdateTemplateData
): Promise<void> => {
  try {
    const functions = getClientFunctions();
    const updateTemplateFn = httpsCallable<
      UpdateTemplateData,
      { success: boolean }
    >(functions, 'updateTemplate');

    await updateTemplateFn(templateData);
  } catch (error: any) {
    console.error('Error updating template:', error);
    throw new Error(error?.message || 'Failed to update template');
  }
};

// Delete a template via Cloud Function
export const deleteTemplate = async (templateId: string): Promise<void> => {
  try {
    const functions = getClientFunctions();
    const deleteTemplateFn = httpsCallable<
      { templateId: string },
      { success: boolean }
    >(functions, 'deleteTemplate');

    await deleteTemplateFn({ templateId });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    throw new Error(error?.message || 'Failed to delete template');
  }
};

// Get all templates for admin management via Cloud Function
export const fetchAllTemplatesForAdmin = async (): Promise<
  (Template & {
    createdAt?: Date;
    lastUpdatedAt?: Date;
  })[]
> => {
  try {
    const functions = getClientFunctions();
    const getAllTemplatesFn = httpsCallable<
      void,
      {
        templates: (Template & {
          createdAt?: Date;
          lastUpdatedAt?: Date;
        })[];
      }
    >(functions, 'getAllTemplatesForAdmin');

    const result = await getAllTemplatesFn();
    return result.data.templates;
  } catch (error: any) {
    console.error('Error fetching templates for admin:', error);
    throw new Error(error?.message || 'Failed to fetch templates');
  }
};

// Sync default templates to Firestore via Cloud Function
export const syncDefaultTemplatesToFirestore = async (): Promise<number> => {
  try {
    const functions = getClientFunctions();
    const syncDefaultTemplatesFn = httpsCallable<void, { syncedCount: number }>(
      functions,
      'syncDefaultTemplates'
    );

    const result = await syncDefaultTemplatesFn();
    return result.data.syncedCount;
  } catch (error: any) {
    console.error('Error syncing default templates:', error);
    throw new Error(error?.message || 'Failed to sync default templates');
  }
};
