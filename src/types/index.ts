import { z } from "zod";
import {
  UserSchema,
  CustomClauseSchema,
  StoredContractDataSchema,
  TemplateSchema,
  PartySchema,
} from "./schemas";

// By inferring types from Zod schemas, we make schemas.ts the single source of truth.
export type User = z.infer<typeof UserSchema>;
export type CustomClause = z.infer<typeof CustomClauseSchema>;
export type Party = z.infer<typeof PartySchema>;
export type StoredContractData = z.infer<typeof StoredContractDataSchema>;
export type Template = z.infer<typeof TemplateSchema>;

// Note: Some specific types like `Timestamp` or `LucideIcon` are represented as `any`
// in the Zod schemas for simplicity during runtime validation.
// For stricter type checking in your components, you can import them directly where needed, e.g.:
// import type { Timestamp } from 'firebase/firestore';
// import type { LucideIcon } from 'lucide-react';
