import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export interface TemplateField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "tel" | "textarea" | "select";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

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

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  fields: TemplateField[];
  baseClauses: string[];
  defaultValues?: Record<string, string>;
  createdAt?: Date;
  lastUpdatedAt?: Date;
}

// Helper function to check if user is admin
const checkAdminAccess = async (uid: string): Promise<void> => {
  try {
    const userRecord = await getAuth().getUser(uid);
    const customClaims = userRecord.customClaims;
    
    if (!customClaims?.admin) {
      throw new HttpsError(
        "permission-denied",
        "Access denied. Admin privileges required."
      );
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Failed to verify admin access"
    );
  }
};

// Create a new template
export const createTemplate = onCall(
  async (request): Promise<{ templateId: string }> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin access
    await checkAdminAccess(request.auth.uid);

    // Validate input
    const { title, category, description, fields, baseClauses, defaultValues } = request.data as CreateTemplateData;
    
    if (!title || !category || !description || !fields || !baseClauses) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: title, category, description, fields, baseClauses"
      );
    }

    try {
      const db = getFirestore();
      const templatesRef = db.collection("templates");
      
      const docRef = await templatesRef.add({
        title,
        category,
        description,
        fields,
        baseClauses,
        defaultValues: defaultValues || {},
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });
      
      return { templateId: docRef.id };
    } catch (error) {
      console.error("Error creating template:", error);
      throw new HttpsError("internal", "Failed to create template");
    }
  }
);

// Update an existing template
export const updateTemplate = onCall(
  async (request): Promise<{ success: boolean }> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin access
    await checkAdminAccess(request.auth.uid);

    // Validate input
    const { id, ...updateData } = request.data as UpdateTemplateData;
    
    if (!id) {
      throw new HttpsError("invalid-argument", "Template ID is required");
    }

    try {
      const db = getFirestore();
      const templateRef = db.collection("templates").doc(id);
      
      // Check if template exists
      const templateDoc = await templateRef.get();
      if (!templateDoc.exists) {
        throw new HttpsError("not-found", "Template not found");
      }
      
      await templateRef.update({
        ...updateData,
        lastUpdatedAt: new Date(),
      });
      
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Error updating template:", error);
      throw new HttpsError("internal", "Failed to update template");
    }
  }
);

// Delete a template
export const deleteTemplate = onCall(
  async (request): Promise<{ success: boolean }> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin access
    await checkAdminAccess(request.auth.uid);

    // Validate input
    const { templateId } = request.data as { templateId: string };
    
    if (!templateId) {
      throw new HttpsError("invalid-argument", "Template ID is required");
    }

    try {
      const db = getFirestore();
      const templateRef = db.collection("templates").doc(templateId);
      
      // Check if template exists
      const templateDoc = await templateRef.get();
      if (!templateDoc.exists) {
        throw new HttpsError("not-found", "Template not found");
      }
      
      await templateRef.delete();
      
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Error deleting template:", error);
      throw new HttpsError("internal", "Failed to delete template");
    }
  }
);

// Get all templates for admin management
export const getAllTemplatesForAdmin = onCall(
  async (request): Promise<{ templates: Template[] }> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin access
    await checkAdminAccess(request.auth.uid);

    try {
      const db = getFirestore();
      const templatesRef = db.collection("templates");
      const querySnapshot = await templatesRef
        .orderBy("lastUpdatedAt", "desc")
        .get();
      
      const templates: Template[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Template));
      
      return { templates };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("Error fetching templates for admin:", error);
      throw new HttpsError("internal", "Failed to fetch templates");
    }
  }
);

// Sync default templates to Firestore
export const syncDefaultTemplates = onCall(
  async (request): Promise<{ syncedCount: number }> => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Check admin access
    await checkAdminAccess(request.auth.uid);

    try {
      const db = getFirestore();
      const templatesRef = db.collection("templates");
      
      // Get existing templates to avoid duplicates
      const existingTemplates = await templatesRef.get();
      const existingTitles = new Set(
        existingTemplates.docs.map((doc) => doc.data().title)
      );
      
      // Default templates to sync
      const defaultTemplates = [
        {
          id: "employment-contract",
          title: "חוזה עבודה",
          category: "עבודה",
          description: "חוזה עבודה סטנדרטי לעובד במשרה מלאה",
          fields: [
            { name: "employeeName", label: "שם העובד", type: "text" as const, required: true },
            { name: "employeeId", label: "ת.ז. העובד", type: "text" as const, required: true },
            { name: "employerName", label: "שם המעסיק", type: "text" as const, required: true },
            { name: "position", label: "תפקיד", type: "text" as const, required: true },
            { name: "salary", label: "שכר", type: "number" as const, required: true },
            { name: "startDate", label: "תאריך התחלה", type: "date" as const, required: true },
          ],
          baseClauses: [
            "העובד יעבוד במשרה מלאה",
            "העובד יקבל שכר חודשי כמפורט בחוזה",
            "העובד יהיה כפוף לחוקי העבודה",
          ],
        },
        {
          id: "rental-agreement",
          title: "חוזה שכירות דירה",
          category: "נדלן",
          description: "חוזה שכירות דירה לטווח ארוך",
          fields: [
            { name: "tenantName", label: "שם השוכר", type: "text" as const, required: true },
            { name: "landlordName", label: "שם המשכיר", type: "text" as const, required: true },
            { name: "propertyAddress", label: "כתובת הנכס", type: "text" as const, required: true },
            { name: "monthlyRent", label: "שכר דירה חודשי", type: "number" as const, required: true },
            { name: "deposit", label: "פיקדון", type: "number" as const, required: true },
            { name: "leaseStart", label: "תחילת השכירות", type: "date" as const, required: true },
            { name: "leaseDuration", label: "משך השכירות (חודשים)", type: "number" as const, required: true },
          ],
          baseClauses: [
            "השוכר יתחייב לשלם את שכר הדירה במועד",
            "השוכר יתחייב לשמור על הנכס",
            "המשכיר יתחייב לתחזק את הנכס",
          ],
        },
      ];
      
      let syncedCount = 0;
      const batch = db.batch();
      
      for (const template of defaultTemplates) {
        if (!existingTitles.has(template.title)) {
          const templateRef = templatesRef.doc(template.id);
          batch.set(templateRef, {
            ...template,
            createdAt: new Date(),
            lastUpdatedAt: new Date(),
          });
          syncedCount++;
        }
      }
      
      if (syncedCount > 0) {
        await batch.commit();
      }
      
      return { syncedCount };
    } catch (error) {
      console.error("Error syncing default templates:", error);
      throw new HttpsError("internal", "Failed to sync default templates");
    }
  }
);
