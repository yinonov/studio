import { z } from "zod";

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

export const RequestDataSchema = z.object({
  contractId: z.string().min(1, { message: "contractId is required" }),
});

export type StoredContractDataSchema = z.infer<typeof StoredContractDataSchema>;
