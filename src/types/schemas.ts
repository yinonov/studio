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

export const CustomClauseSchema = z.object({
  description: z.string(),
  legalWording: z.string(),
});

export const PartySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  status: z.enum(["pending", "signed"]),
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
  status: z.string(), // Consider an enum: ['draft', 'pending', 'completed']
  createdAt: z.any(), // Firestore Timestamps
  lastUpdatedAt: z.any(), // Firestore Timestamps
  sharedWith: z.array(z.string()).optional(),
  signatureRequestId: z.string().optional(),
});

export const RequestDataSchema = z.object({
  contractId: z.string().min(1, { message: "contractId is required" }),
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
