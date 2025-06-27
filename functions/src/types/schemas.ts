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

  // Dropbox Sign / HelloSign
  signatureRequestId: z.string().optional(),
  auditTrailUrl: z.string().url().optional(),

  // DocRaptor & Storage
  docraptorJobId: z.string().optional(),
  pdfUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const RequestDataSchema = z.object({
  contractId: z.string().min(1, { message: "contractId is required" }),
});

export const DropboxSignEventSchema = z.object({
  event: z.object({
    event_type: z.string(),
    event_time: z.string(),
    event_hash: z.string(),
    event_metadata: z.object({
      related_signature_id: z.string().nullable(),
      reported_for_account_id: z.string(),
      reported_for_app_id: z.string().nullable(),
      event_message: z.string().nullable(),
    }),
  }),
  signature_request: z.object({
    signature_request_id: z.string(),
    test_mode: z.boolean(),
    is_complete: z.boolean(),
    is_declined: z.boolean(),
    has_error: z.boolean(),
    custom_fields: z.array(z.any()),
    response_data: z.array(z.any()),
    signatures: z.array(
      z.object({
        signature_id: z.string(),
        signer_email_address: z.string(),
        signer_name: z.string(),
        order: z.number().nullable(),
        status_code: z.string(),
        signed_at: z.number().nullable(),
        last_viewed_at: z.number().nullable(),
        last_reminded_at: z.number().nullable(),
        has_pin: z.boolean(),
        has_sms_auth: z.boolean(),
        has_sms_delivery: z.boolean(),
        error: z.string().nullable(),
      }),
    ),
    requester_email_address: z.string(),
  }),
});
