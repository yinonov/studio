import { z } from "zod";

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  phoneNumber: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
  subscriptionTier: z.enum(["free", "premium"]).optional(),
  createdAt: z.any().optional(), // Firestore Timestamps are tricky with Zod
});

export const TemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  icon: z.any().optional(), // LucideIcon is a React component
  fields: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        placeholder: z.string().optional(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
  defaultValues: z.record(z.string()).optional(),
  baseClauses: z.array(z.string()).optional(),
});

// Added schemas to be available on the client-side
export const CustomClauseSchema = z.object({
  description: z.string(),
  legalWording: z.string(),
});

export const PartySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  status: z.enum(["pending", "signed"]).optional(),
  signatureId: z.string().optional(),
});

export const StoredContractDataSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  templateId: z.string(),
  title: z.string(),
  formData: z.record(z.any()),
  customClauses: z.array(CustomClauseSchema).optional(),
  parties: z.array(PartySchema).optional(),
  status: z.enum([
    "draft",
    "generating-pdf",
    "out-for-signature",
    "partially-signed",
    "completed",
    "voided",
    "declined",
    "error",
  ]),
  createdAt: z.any(), // Firestore Timestamps
  lastUpdatedAt: z.any(), // Firestore Timestamps
  sharedWith: z.array(z.string()).optional(),
});
