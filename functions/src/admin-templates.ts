import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";

// Zod schemas for validation
const TemplateFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "date", "email", "tel", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

const CreationStepSchema = z.object({
  name: z.string(),
  description: z.string(),
  fieldIds: z.array(z.string()),
});

const CreateTemplateDataSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  fields: z.array(TemplateFieldSchema),
  baseClauses: z.array(z.string()),
  creationSteps: z.array(CreationStepSchema).optional(),
  defaultValues: z.record(z.string()).optional(),
});

const UpdateTemplateDataSchema = CreateTemplateDataSchema.partial().extend({
  id: z.string(),
});

const TemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  fields: z.array(TemplateFieldSchema),
  baseClauses: z.array(z.string()),
  creationSteps: z.array(CreationStepSchema).optional(),
  defaultValues: z.record(z.string()).optional(),
  createdAt: z.date().optional(),
  lastUpdatedAt: z.date().optional(),
});

// Type exports for use in other files
export type TemplateField = z.infer<typeof TemplateFieldSchema>;
export type CreationStep = z.infer<typeof CreationStepSchema>;
export type CreateTemplateData = z.infer<typeof CreateTemplateDataSchema>;
export type UpdateTemplateData = z.infer<typeof UpdateTemplateDataSchema>;
export type Template = z.infer<typeof TemplateSchema>;

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

    // Validate input with Zod
    try {
      const validatedData = CreateTemplateDataSchema.parse(request.data);
      
      const db = getFirestore();
      const templatesRef = db.collection("templates");
      
      const docRef = await templatesRef.add({
        ...validatedData,
        defaultValues: validatedData.defaultValues || {},
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });
      
      return { templateId: docRef.id };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new HttpsError(
          "invalid-argument",
          `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
        );
      }
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

    // Validate input with Zod
    try {
      const validatedData = UpdateTemplateDataSchema.parse(request.data);
      const { id, ...updateData } = validatedData;
      
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
      if (error instanceof z.ZodError) {
        throw new HttpsError(
          "invalid-argument",
          `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
        );
      }
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

    // Validate input with Zod
    const DeleteTemplateDataSchema = z.object({
      templateId: z.string().min(1),
    });

    try {
      const { templateId } = DeleteTemplateDataSchema.parse(request.data);
      
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
      if (error instanceof z.ZodError) {
        throw new HttpsError(
          "invalid-argument",
          `Validation error: ${error.errors.map((e) => e.message).join(", ")}`
        );
      }
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
            { id: "employeeName", label: "שם העובד", type: "text" as const, required: true },
            { id: "employeeId", label: "ת.ז. העובד", type: "text" as const, required: true },
            { id: "employerName", label: "שם המעסיק", type: "text" as const, required: true },
            { id: "position", label: "תפקיד", type: "text" as const, required: true },
            { id: "salary", label: "שכר", type: "number" as const, required: true },
            { id: "startDate", label: "תאריך התחלה", type: "date" as const, required: true },
          ],
          creationSteps: [
            {
              name: "פרטי העובד",
              description: "מידע בסיסי על העובד",
              fieldIds: ["employeeName", "employeeId"],
            },
            {
              name: "פרטי העבודה",
              description: "תנאי העבודה והתפקיד",
              fieldIds: ["employerName", "position", "salary", "startDate"],
            },
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
            { id: "tenantName", label: "שם השוכר", type: "text" as const, required: true },
            { id: "landlordName", label: "שם המשכיר", type: "text" as const, required: true },
            { id: "propertyAddress", label: "כתובת הנכס", type: "text" as const, required: true },
            { id: "monthlyRent", label: "שכר דירה חודשי", type: "number" as const, required: true },
            { id: "deposit", label: "פיקדון", type: "number" as const, required: true },
            { id: "leaseStart", label: "תחילת השכירות", type: "date" as const, required: true },
            { id: "leaseDuration", label: "משך השכירות (חודשים)", type: "number" as const, required: true },
          ],
          creationSteps: [
            {
              name: "פרטי הנכס",
              description: "מידע על הנכס ובעליו",
              fieldIds: ["propertyAddress", "landlordName"],
            },
            {
              name: "פרטי השכירות",
              description: "תנאי השכירות והתמורה",
              fieldIds: ["tenantName", "monthlyRent", "deposit", "leaseStart", "leaseDuration"],
            },
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
