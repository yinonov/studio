import { z } from 'zod';

// Access control schemas based on the report recommendations

/**
 * CustomClauseSchema - Individual contract clause structure
 * Responsibility: Define custom legal clauses that can be added to contracts
 * Used by: Contract creation, template management, legal review
 */
export const CustomClauseSchema = z.object({
  description: z.string(),
  legalWording: z.string(),
});

/**
 * AccessLevelSchema - Defines the hierarchy of access levels for contracts
 * - owner: Full control, can delete, share, and manage all aspects
 * - collaborator: Can edit and share, but cannot delete
 * - signer: Can view, comment, and sign documents
 * - viewer: Read-only access, can view and download
 * - group_member: Access inherited from group membership
 * - admin_viewer: Organization admin with read-only oversight access
 */
export const AccessLevelSchema = z.enum([
  'owner',
  'signer',
  'viewer',
  'collaborator',
  'group_member',
  'admin_viewer',
]);

/**
 * PermissionSchema - Granular permissions that can be granted independently
 * - view: Can see contract content and metadata
 * - edit: Can modify contract content and settings
 * - sign: Can add signatures to the contract
 * - download: Can download contract files and attachments
 * - manage: Can change contract settings and workflow
 * - comment: Can add comments and annotations
 * - share: Can invite others and grant access
 * - delete: Can delete or void the contract
 */
export const PermissionSchema = z.enum([
  'view',
  'edit',
  'sign',
  'download',
  'manage',
  'comment',
  'share',
  'delete',
]);

/**
 * GroupSchema - User groups for bulk access management
 * Responsibility: Organize users into groups with shared permissions
 * Use cases: Department access, project teams, approval committees
 * Enables: Bulk permission grants, organizational hierarchy
 */
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(PermissionSchema),
  organizationId: z.string().optional(),
  createdAt: z.any(), // Firestore Timestamp
  lastUpdatedAt: z.any(),
});

/**
 * UserSchema - Extended user profile with contract-related metadata
 * Responsibility: Store user information and denormalized contract counts
 * Denormalized fields: Improve dashboard performance by avoiding expensive queries
 * Role hierarchy: admin > manager > member > viewer (organizational permissions)
 */
export const UserSchema = z.object({
  id: z.string(), // Firebase Auth UID
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'manager', 'member', 'viewer']),
  groupIds: z.array(z.string()).default([]),
  organizationId: z.string().optional(),
  // Denormalized counts for performance
  totalContracts: z.number().default(0),
  pendingSignatureCount: z.number().default(0),
  ownedContractsCount: z.number().default(0),
  sharedContractsCount: z.number().default(0),
  createdAt: z.any(),
  lastUpdatedAt: z.any(),
});

/**
 * ContractAccessSchema - Junction table for many-to-many user-contract relationships
 * Responsibility: Core access control - who has what access to which contracts
 * Replaces: Simple ownerId field with sophisticated permission system
 * Enables: Contract sharing, role-based access, permission delegation
 * Query pattern: contract_access.where('userId', '==', uid) to get user's contracts
 */
export const ContractAccessSchema = z.object({
  id: z.string(), // Auto-generated Firestore document ID
  contractId: z.string(), // Reference to contracts collection
  userId: z.string(), // Reference to users collection (Firebase Auth UID)
  accessLevel: AccessLevelSchema,
  permissions: z.array(PermissionSchema),
  groupId: z.string().optional(), // If access granted via group
  grantedBy: z.string().optional(), // Who granted this access
  grantedAt: z.any(), // When access was granted
  expiresAt: z.any().optional(), // Optional expiration
  email: z.string().email().optional(), // Denormalized for quick lookups
  name: z.string().optional(), // Denormalized for quick display
});

/**
 * ContractSchema - Core contract document structure
 * Responsibility: Store contract metadata, status, and content references
 * Key change: Removed sharedWith array - now uses contract_access collection
 * Status workflow: draft → generating-pdf → out-for-signature → completed/voided
 * Migration: Includes sharedWith for backward compatibility during transition
 */
export const ContractSchema = z.object({
  id: z.string(),
  ownerId: z.string(), // Firebase Auth UID
  templateId: z.string(),
  title: z.string(),
  status: z.enum([
    'draft',
    'generating-pdf',
    'out-for-signature',
    'partially-signed',
    'completed',
    'voided',
    'declined',
    'error',
  ]),
  contractType: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  organizationId: z.string().optional(),
  dropboxSignSignatureRequestId: z.string().optional(),
  formData: z.record(z.any()),
  customClauses: z.array(CustomClauseSchema).optional(),
  tags: z.array(z.string()).default([]),
  // Security & Audit
  createdAt: z.any(),
  lastUpdatedAt: z.any(),
  // Legacy field for backward compatibility during migration
  sharedWith: z.array(z.string()).optional(),
});

/**
 * AuditLogSchema - Comprehensive audit trail for security and compliance
 * Responsibility: Track all contract-related actions for security and compliance
 * Use cases: Security monitoring, compliance reporting, user activity tracking
 * GDPR compliance: Include IP and user agent for security analysis
 */
export const AuditLogSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  userId: z.string(),
  action: z.enum([
    'created',
    'viewed',
    'edited',
    'shared',
    'signed',
    'status_changed',
    'permission_granted',
    'permission_revoked',
    'downloaded',
    'deleted',
    'restored',
  ]),
  details: z.record(z.any()).optional(),
  timestamp: z.any(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * ContractListQuerySchema - Comprehensive query parameters for contract filtering
 * Responsibility: Define all possible filters and sorting options for contract lists
 * Features: Pagination, status filters, search, access level filtering, sorting
 * Performance: Limit enforced to prevent expensive queries
 */
export const ContractListQuerySchema = z.object({
  userId: z.string(),
  page: z.number().default(1),
  limit: z.number().min(1).max(100).default(20),
  status: z.array(z.string()).optional(),
  contractType: z.string().optional(),
  accessLevel: z.array(AccessLevelSchema).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z
    .enum(['createdAt', 'lastUpdatedAt', 'title', 'effectiveDate'])
    .default('lastUpdatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * RequestDataSchema - Standard request format for contract operations
 * Responsibility: Validate Cloud Function request parameters
 * Used by: Contract management functions, API validation
 */
export const RequestDataSchema = z.object({
  contractId: z.string().min(1, { message: 'contractId is required' }),
});

// =============================================================================
// TYPE EXPORTS - TypeScript types inferred from Zod schemas above
// =============================================================================

export type AccessLevel = z.infer<typeof AccessLevelSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type CustomClause = z.infer<typeof CustomClauseSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type User = z.infer<typeof UserSchema>;
export type ContractAccess = z.infer<typeof ContractAccessSchema>;
export type Contract = z.infer<typeof ContractSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type ContractListQuery = z.infer<typeof ContractListQuerySchema>;
export type RequestData = z.infer<typeof RequestDataSchema>;

/**
 * ContractWithAccess - Enhanced contract type with user's access information
 * Responsibility: Combine contract data with user's specific access level and permissions
 * Use case: Frontend display where we need both contract info and what user can do
 * Replaces: Manual permission checking in components
 */
export type ContractWithAccess = Contract & {
  userAccess: {
    accessLevel: AccessLevel;
    permissions: Permission[];
  };
};

/**
 * ContractListResponse - Paginated API response for contract queries
 * Responsibility: Standard format for contract list endpoints with pagination
 * Performance: Includes total count for pagination UI without additional queries
 */
export type ContractListResponse = {
  contracts: ContractWithAccess[];
  totalCount: number;
  pageToken?: string;
};
