// DEPRECATED: This file is being migrated to @shared/types/access-control
// Simple re-exports for backward compatibility during migration
// TODO: Update all imports to use @shared/types/access-control directly

// Re-export contract-related schemas and types from shared
export {
  CustomClauseSchema,
  ContractSchema,
  RequestDataSchema,
} from "@shared/types/access-control";

export type {
  CustomClause,
  Contract,
  RequestData,
} from "@shared/types/access-control";
