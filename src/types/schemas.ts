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
