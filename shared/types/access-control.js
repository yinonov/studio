"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestDataSchema = exports.ContractListQuerySchema = exports.AuditLogSchema = exports.ContractSchema = exports.ContractAccessSchema = exports.UserSchema = exports.GroupSchema = exports.PermissionSchema = exports.AccessLevelSchema = exports.CustomClauseSchema = void 0;
const zod_1 = require("zod");
// Access control schemas based on the report recommendations
/**
 * CustomClauseSchema - Individual contract clause structure
 * Responsibility: Define custom legal clauses that can be added to contracts
 * Used by: Contract creation, template management, legal review
 */
exports.CustomClauseSchema = zod_1.z.object({
    description: zod_1.z.string(),
    legalWording: zod_1.z.string(),
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
exports.AccessLevelSchema = zod_1.z.enum([
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
exports.PermissionSchema = zod_1.z.enum([
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
exports.GroupSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    permissions: zod_1.z.array(exports.PermissionSchema),
    organizationId: zod_1.z.string().optional(),
    createdAt: zod_1.z.any(), // Firestore Timestamp
    lastUpdatedAt: zod_1.z.any(),
});
/**
 * UserSchema - Extended user profile with contract-related metadata
 * Responsibility: Store user information and denormalized contract counts
 * Denormalized fields: Improve dashboard performance by avoiding expensive queries
 * Role hierarchy: admin > manager > member > viewer (organizational permissions)
 */
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(), // Firebase Auth UID
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: zod_1.z.enum(['admin', 'manager', 'member', 'viewer']),
    groupIds: zod_1.z.array(zod_1.z.string()).default([]),
    organizationId: zod_1.z.string().optional(),
    // Denormalized counts for performance
    totalContracts: zod_1.z.number().default(0),
    pendingSignatureCount: zod_1.z.number().default(0),
    ownedContractsCount: zod_1.z.number().default(0),
    sharedContractsCount: zod_1.z.number().default(0),
    createdAt: zod_1.z.any(),
    lastUpdatedAt: zod_1.z.any(),
});
/**
 * ContractAccessSchema - Junction table for many-to-many user-contract relationships
 * Responsibility: Core access control - who has what access to which contracts
 * Replaces: Simple ownerId field with sophisticated permission system
 * Enables: Contract sharing, role-based access, permission delegation
 * Query pattern: contract_access.where('userId', '==', uid) to get user's contracts
 */
exports.ContractAccessSchema = zod_1.z.object({
    id: zod_1.z.string(), // Auto-generated Firestore document ID
    contractId: zod_1.z.string(), // Reference to contracts collection
    userId: zod_1.z.string(), // Reference to users collection (Firebase Auth UID)
    accessLevel: exports.AccessLevelSchema,
    permissions: zod_1.z.array(exports.PermissionSchema),
    groupId: zod_1.z.string().optional(), // If access granted via group
    grantedBy: zod_1.z.string().optional(), // Who granted this access
    grantedAt: zod_1.z.any(), // When access was granted
    expiresAt: zod_1.z.any().optional(), // Optional expiration
    email: zod_1.z.string().email().optional(), // Denormalized for quick lookups
    name: zod_1.z.string().optional(), // Denormalized for quick display
});
/**
 * ContractSchema - Core contract document structure
 * Responsibility: Store contract metadata, status, and content references
 * Key change: Removed sharedWith array - now uses contract_access collection
 * Status workflow: draft → generating-pdf → out-for-signature → completed/voided
 * Migration: Includes sharedWith for backward compatibility during transition
 */
exports.ContractSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ownerId: zod_1.z.string(), // Firebase Auth UID
    templateId: zod_1.z.string(),
    title: zod_1.z.string(),
    status: zod_1.z.enum([
        'draft',
        'generating-pdf',
        'out-for-signature',
        'partially-signed',
        'completed',
        'voided',
        'declined',
        'error',
    ]),
    contractType: zod_1.z.string().optional(),
    effectiveDate: zod_1.z.string().optional(),
    expirationDate: zod_1.z.string().optional(),
    organizationId: zod_1.z.string().optional(),
    dropboxSignSignatureRequestId: zod_1.z.string().optional(),
    formData: zod_1.z.record(zod_1.z.any()),
    customClauses: zod_1.z.array(exports.CustomClauseSchema).optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    // Security & Audit
    createdAt: zod_1.z.any(),
    lastUpdatedAt: zod_1.z.any(),
    // Legacy field for backward compatibility during migration
    sharedWith: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * AuditLogSchema - Comprehensive audit trail for security and compliance
 * Responsibility: Track all contract-related actions for security and compliance
 * Use cases: Security monitoring, compliance reporting, user activity tracking
 * GDPR compliance: Include IP and user agent for security analysis
 */
exports.AuditLogSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contractId: zod_1.z.string(),
    userId: zod_1.z.string(),
    action: zod_1.z.enum([
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
    details: zod_1.z.record(zod_1.z.any()).optional(),
    timestamp: zod_1.z.any(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
});
/**
 * ContractListQuerySchema - Comprehensive query parameters for contract filtering
 * Responsibility: Define all possible filters and sorting options for contract lists
 * Features: Pagination, status filters, search, access level filtering, sorting
 * Performance: Limit enforced to prevent expensive queries
 */
exports.ContractListQuerySchema = zod_1.z.object({
    userId: zod_1.z.string(),
    page: zod_1.z.number().default(1),
    limit: zod_1.z.number().min(1).max(100).default(20),
    status: zod_1.z.array(zod_1.z.string()).optional(),
    contractType: zod_1.z.string().optional(),
    accessLevel: zod_1.z.array(exports.AccessLevelSchema).optional(),
    search: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    sortBy: zod_1.z
        .enum(['createdAt', 'lastUpdatedAt', 'title', 'effectiveDate'])
        .default('lastUpdatedAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
/**
 * RequestDataSchema - Standard request format for contract operations
 * Responsibility: Validate Cloud Function request parameters
 * Used by: Contract management functions, API validation
 */
exports.RequestDataSchema = zod_1.z.object({
    contractId: zod_1.z.string().min(1, { message: 'contractId is required' }),
});
//# sourceMappingURL=access-control.js.map