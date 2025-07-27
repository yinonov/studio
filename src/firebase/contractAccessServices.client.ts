import { httpsCallable } from 'firebase/functions';
import { getClientFunctions } from '@/lib/firebase';
import type {
  ContractListQuery,
  ContractListResponse,
  AccessLevel,
  Permission,
} from '../../shared/types/access-control';

// Get Firebase functions instance
const functions = getClientFunctions();

// Define client function interfaces
interface GrantAccessRequest {
  contractId: string;
  userEmails: string[];
  accessLevel: AccessLevel;
  permissions: Permission[];
  message?: string;
}

interface GrantAccessResponse {
  success: boolean;
  results: Array<{
    email: string;
    status: 'granted' | 'updated' | 'error';
    error?: string;
  }>;
}

interface RevokeAccessRequest {
  contractId: string;
  userIds: string[];
}

interface RevokeAccessResponse {
  success: boolean;
  revokedCount: number;
}

interface GetAccessListRequest {
  contractId: string;
}

interface GetAccessListResponse {
  accessList: Array<{
    id: string;
    userId: string;
    email?: string;
    name?: string;
    accessLevel: AccessLevel;
    permissions: Permission[];
    grantedBy: string;
    grantedAt: any; // Firestore Timestamp
    contractId: string;
    groupId?: string;
    expiresAt?: any;
  }>;
}

interface UpdateAccessRequest {
  contractId: string;
  userId: string;
  accessLevel: AccessLevel;
  permissions: Permission[];
}

interface UpdateAccessResponse {
  success: boolean;
  message: string;
}

interface ListContractsRequest {
  userId: string;
  page?: number;
  limit?: number;
  status?: string[];
  contractType?: string;
  accessLevel?: AccessLevel[];
  search?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'lastUpdatedAt' | 'title' | 'effectiveDate';
  sortOrder?: 'asc' | 'desc';
}

// Create callable functions
const grantContractAccessFunction = httpsCallable<
  GrantAccessRequest,
  GrantAccessResponse
>(functions, 'grantContractAccess');

const revokeContractAccessFunction = httpsCallable<
  RevokeAccessRequest,
  RevokeAccessResponse
>(functions, 'revokeContractAccess');

const getContractAccessListFunction = httpsCallable<
  GetAccessListRequest,
  GetAccessListResponse
>(functions, 'getContractAccessList');

const updateContractAccessFunction = httpsCallable<
  UpdateAccessRequest,
  UpdateAccessResponse
>(functions, 'updateContractAccess');

const listContractsWithAccessFunction = httpsCallable<
  ListContractsRequest,
  ContractListResponse
>(functions, 'listContractsWithAccess');

// Exported client functions with error handling

/**
 * Grant access to a contract for multiple users
 */
export async function grantContractAccess(params: {
  contractId: string;
  userEmails: string[];
  accessLevel: AccessLevel;
  permissions: Permission[];
  message?: string;
}): Promise<GrantAccessResponse> {
  try {
    const result = await grantContractAccessFunction(params);
    return result.data;
  } catch (error) {
    console.error('Error granting contract access:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to grant access'
    );
  }
}

/**
 * Revoke access to a contract for multiple users
 */
export async function revokeContractAccess(params: {
  contractId: string;
  userIds: string[];
}): Promise<{ success: boolean; revokedCount: number }> {
  try {
    const result = await revokeContractAccessFunction({
      contractId: params.contractId,
      userIds: params.userIds,
    });
    return result.data;
  } catch (error) {
    console.error('Error revoking contract access:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to revoke access'
    );
  }
}

/**
 * Get list of users with access to a contract
 */
export async function getContractAccessList(
  contractId: string
): Promise<GetAccessListResponse> {
  try {
    const result = await getContractAccessListFunction({ contractId });

    // Add contractId to each access record to match ContractAccess type
    const accessListWithContractId = result.data.accessList.map(access => ({
      ...access,
      contractId,
      email: access.email || undefined,
      name: access.name || undefined,
      groupId: undefined,
      expiresAt: undefined,
    }));

    return {
      accessList: accessListWithContractId,
    };
  } catch (error) {
    console.error('Error getting contract access list:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get access list'
    );
  }
}

/**
 * Update access level and permissions for a user
 */
export async function updateContractAccess(params: {
  contractId: string;
  targetUserId: string;
  accessLevel: AccessLevel;
  permissions: Permission[];
}): Promise<UpdateAccessResponse> {
  try {
    const result = await updateContractAccessFunction({
      contractId: params.contractId,
      userId: params.targetUserId,
      accessLevel: params.accessLevel,
      permissions: params.permissions,
    });
    return result.data;
  } catch (error) {
    console.error('Error updating contract access:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update access'
    );
  }
}

/**
 * Fetch contracts with access control (used by services)
 * This is a wrapper around the listContractsWithAccess function
 */
export async function fetchContractsWithAccess(
  query: Partial<ContractListQuery>
): Promise<ContractListResponse> {
  // Ensure userId is provided - this should come from the calling hook
  if (!query.userId) {
    throw new Error('userId is required for fetching contracts');
  }

  // Convert partial query to full query with defaults
  const fullQuery: ContractListQuery = {
    userId: query.userId,
    page: query.page || 1,
    limit: query.limit || 20,
    sortBy: query.sortBy || 'lastUpdatedAt',
    sortOrder: query.sortOrder || 'desc',
    ...query,
  };

  try {
    const result = await listContractsWithAccessFunction(fullQuery);
    return result.data;
  } catch (error) {
    console.error('Error fetching contracts with access:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch contracts'
    );
  }
}
