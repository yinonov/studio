import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onUserCreated } from 'firebase-functions/v2/identity';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';
import * as logger from 'firebase-functions/logger';

// Import the access control schemas from shared
import {
  AccessLevelSchema,
  PermissionSchema,
} from '../../shared/types/access-control';

// Helper function to check if user has access to a contract
async function checkContractAccess(
  userId: string,
  contractId: string,
  requiredPermission: string
): Promise<boolean> {
  const db = getFirestore();

  // Check if user has direct access
  const accessQuery = await db
    .collection('contract_access')
    .where('contractId', '==', contractId)
    .where('userId', '==', userId)
    .get();

  if (!accessQuery.empty) {
    const access = accessQuery.docs[0].data();
    return access.permissions.includes(requiredPermission);
  }

  // Check if user is the contract owner
  const contractDoc = await db.collection('contracts').doc(contractId).get();
  if (contractDoc.exists) {
    const contract = contractDoc.data();
    if (contract?.ownerId === userId) {
      return true; // Owners have all permissions
    }
  }

  return false;
}

// Helper function to audit log contract actions
async function auditLog(
  contractId: string,
  userId: string,
  action: string,
  details?: any,
  request?: any
) {
  const db = getFirestore();

  const auditData = {
    contractId,
    userId,
    action,
    details: details || {},
    timestamp: FieldValue.serverTimestamp(),
    ipAddress: request?.rawRequest?.ip || 'unknown',
    userAgent: request?.rawRequest?.headers?.['user-agent'] || 'unknown',
  };

  await db.collection('audit_log').add(auditData);
}

/**
 * Grant access to a contract for specific users
 */
export const grantContractAccess = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const GrantAccessSchema = z.object({
    contractId: z.string().min(1),
    userEmails: z.array(z.string().email()),
    accessLevel: AccessLevelSchema,
    permissions: z.array(PermissionSchema),
    message: z.string().optional(),
  });

  try {
    const { contractId, userEmails, accessLevel, permissions } =
      GrantAccessSchema.parse(request.data);

    const granterId = request.auth.uid;

    // Check if granter has 'manage' or 'share' permission on the contract
    const canShare =
      (await checkContractAccess(granterId, contractId, 'manage')) ||
      (await checkContractAccess(granterId, contractId, 'share'));

    if (!canShare) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to share this contract'
      );
    }

    const db = getFirestore();
    const auth = getAuth();

    // Process each email
    const results = [];
    for (const email of userEmails) {
      try {
        // Try to find user by email
        let userId: string;
        try {
          const userRecord = await auth.getUserByEmail(email);
          userId = userRecord.uid;
        } catch (error) {
          // User doesn't exist yet, create access entry with email only
          userId = '';
        }

        // Check if access already exists
        const existingAccessQuery = await db
          .collection('contract_access')
          .where('contractId', '==', contractId)
          .where(userId ? 'userId' : 'email', '==', userId || email)
          .get();

        if (!existingAccessQuery.empty) {
          // Update existing access
          const accessDoc = existingAccessQuery.docs[0];
          await accessDoc.ref.update({
            accessLevel,
            permissions,
            grantedBy: granterId,
            grantedAt: FieldValue.serverTimestamp(),
          });
          results.push({ email, status: 'updated' });
        } else {
          // Create new access entry
          await db.collection('contract_access').add({
            contractId,
            userId,
            email,
            accessLevel,
            permissions,
            grantedBy: granterId,
            grantedAt: FieldValue.serverTimestamp(),
          });
          results.push({ email, status: 'granted' });
        }

        // Audit log
        await auditLog(
          contractId,
          granterId,
          'permission_granted',
          { targetEmail: email, accessLevel, permissions },
          request
        );
      } catch (error) {
        logger.error(`Error granting access to ${email}:`, error);
        results.push({
          email,
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    return { success: true, results };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        'invalid-argument',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw new HttpsError(
      'internal',
      `Failed to grant access: ${(error as Error).message}`
    );
  }
});

/**
 * Revoke access to a contract for specific users
 */
export const revokeContractAccess = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const RevokeAccessSchema = z.object({
    contractId: z.string().min(1),
    userIds: z.array(z.string()),
  });

  try {
    const { contractId, userIds } = RevokeAccessSchema.parse(request.data);
    const revokerId = request.auth.uid;

    // Check if revoker has 'manage' permission
    const canManage = await checkContractAccess(
      revokerId,
      contractId,
      'manage'
    );
    if (!canManage) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to revoke access to this contract'
      );
    }

    const db = getFirestore();
    const batch = db.batch();

    // Revoke access for each user
    for (const userId of userIds) {
      // Don't allow revoking owner access
      const contractDoc = await db
        .collection('contracts')
        .doc(contractId)
        .get();
      if (contractDoc.exists) {
        const contract = contractDoc.data();
        if (contract?.ownerId === userId) {
          continue; // Skip owner - can't revoke owner access
        }
      }

      const accessQuery = await db
        .collection('contract_access')
        .where('contractId', '==', contractId)
        .where('userId', '==', userId)
        .get();

      accessQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Audit log
      await auditLog(
        contractId,
        revokerId,
        'permission_revoked',
        { targetUserId: userId },
        request
      );
    }

    await batch.commit();

    return { success: true, revokedCount: userIds.length };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        'invalid-argument',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw new HttpsError(
      'internal',
      `Failed to revoke access: ${(error as Error).message}`
    );
  }
});

/**
 * Get list of users who have access to a contract
 */
export const getContractAccessList = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const GetAccessListSchema = z.object({
    contractId: z.string().min(1),
  });

  try {
    const { contractId } = GetAccessListSchema.parse(request.data);
    const userId = request.auth.uid;

    // Check if user has access to view this contract
    const hasAccess = await checkContractAccess(userId, contractId, 'view');
    if (!hasAccess) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to view access list for this contract'
      );
    }

    const db = getFirestore();

    // Get contract access list
    const accessQuery = await db
      .collection('contract_access')
      .where('contractId', '==', contractId)
      .get();

    const accessList = accessQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        email: data.email,
        name: data.name,
        accessLevel: data.accessLevel,
        permissions: data.permissions,
        grantedBy: data.grantedBy,
        grantedAt: data.grantedAt,
      };
    });

    // Also get contract owner info
    const contractDoc = await db.collection('contracts').doc(contractId).get();
    if (contractDoc.exists) {
      const contract = contractDoc.data();
      const ownerAccess = {
        id: `owner_${contract?.ownerId}`, // Generate a synthetic ID for owner
        userId: contract?.ownerId,
        email: contract?.ownerEmail || null,
        name: contract?.ownerName || null,
        accessLevel: 'owner',
        permissions: [
          'view',
          'edit',
          'sign',
          'download',
          'manage',
          'share',
          'delete',
        ],
        grantedBy: contract?.ownerId, // Owner granted access to themselves
        grantedAt: contract?.createdAt,
      };

      // Add owner to list if not already present
      const hasOwnerInList = accessList.some(
        access => access.userId === contract?.ownerId
      );
      if (!hasOwnerInList) {
        accessList.unshift(ownerAccess);
      }
    }

    return { accessList };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        'invalid-argument',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw new HttpsError(
      'internal',
      `Failed to get access list: ${(error as Error).message}`
    );
  }
});

/**
 * Update user's access level and permissions for a contract
 */
export const updateContractAccess = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const UpdateAccessSchema = z.object({
    contractId: z.string().min(1),
    targetUserId: z.string().min(1),
    accessLevel: AccessLevelSchema,
    permissions: z.array(PermissionSchema),
  });

  try {
    const { contractId, targetUserId, accessLevel, permissions } =
      UpdateAccessSchema.parse(request.data);

    const updaterId = request.auth.uid;

    // Check if updater has 'manage' permission
    const canManage = await checkContractAccess(
      updaterId,
      contractId,
      'manage'
    );
    if (!canManage) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to update access for this contract'
      );
    }

    const db = getFirestore();

    // Find and update access record
    const accessQuery = await db
      .collection('contract_access')
      .where('contractId', '==', contractId)
      .where('userId', '==', targetUserId)
      .get();

    if (accessQuery.empty) {
      throw new HttpsError('not-found', 'Access record not found');
    }

    const accessDoc = accessQuery.docs[0];
    await accessDoc.ref.update({
      accessLevel,
      permissions,
      lastUpdatedAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await auditLog(
      contractId,
      updaterId,
      'permission_updated',
      { targetUserId, accessLevel, permissions },
      request
    );

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        'invalid-argument',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw new HttpsError(
      'internal',
      `Failed to update access: ${(error as Error).message}`
    );
  }
});

/**
 * Enhanced contract listing with access control
 */
export const listContractsWithAccess = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const ListContractsSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    status: z.array(z.string()).optional(),
    accessLevel: z.array(AccessLevelSchema).optional(),
    sortBy: z
      .enum(['createdAt', 'lastUpdatedAt', 'title'])
      .default('lastUpdatedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  });

  try {
    const queryParams = ListContractsSchema.parse(request.data);
    const userId = request.auth.uid;

    const db = getFirestore();

    // Step 1: Get all contracts this user has access to
    let accessQuery = db
      .collection('contract_access')
      .where('userId', '==', userId);

    if (queryParams.accessLevel && queryParams.accessLevel.length > 0) {
      accessQuery = accessQuery.where(
        'accessLevel',
        'in',
        queryParams.accessLevel
      );
    }

    const accessSnapshot = await accessQuery.get();
    const contractIds = accessSnapshot.docs.map(doc => doc.data().contractId);

    if (contractIds.length === 0) {
      return {
        contracts: [],
        totalCount: 0,
        page: queryParams.page,
        totalPages: 0,
      };
    }

    // Step 2: Get contracts in batches (Firestore limit of 10 for 'in' queries)
    const allContracts = [];
    const batchSize = 10;

    for (let i = 0; i < contractIds.length; i += batchSize) {
      const batch = contractIds.slice(i, i + batchSize);
      let contractsQuery = db
        .collection('contracts')
        .where('__name__', 'in', batch);

      if (queryParams.status && queryParams.status.length > 0) {
        contractsQuery = contractsQuery.where(
          'status',
          'in',
          queryParams.status
        );
      }

      const contractsSnapshot = await contractsQuery.get();
      const batchContracts = contractsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      allContracts.push(...batchContracts);
    }

    // Step 3: Sort and paginate
    allContracts.sort((a: any, b: any) => {
      const aValue = a[queryParams.sortBy];
      const bValue = b[queryParams.sortBy];

      if (
        queryParams.sortBy === 'createdAt' ||
        queryParams.sortBy === 'lastUpdatedAt'
      ) {
        const aTime = aValue?.seconds || 0;
        const bTime = bValue?.seconds || 0;
        return queryParams.sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      }

      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      const comparison = aStr.localeCompare(bStr);
      return queryParams.sortOrder === 'desc' ? -comparison : comparison;
    });

    const totalCount = allContracts.length;
    const totalPages = Math.ceil(totalCount / queryParams.limit);
    const startIndex = (queryParams.page - 1) * queryParams.limit;
    const endIndex = startIndex + queryParams.limit;
    const paginatedContracts = allContracts.slice(startIndex, endIndex);

    return {
      contracts: paginatedContracts,
      totalCount,
      page: queryParams.page,
      totalPages,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError(
        'invalid-argument',
        `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw new HttpsError(
      'internal',
      `Failed to list contracts: ${(error as Error).message}`
    );
  }
});

/**
 * Associate pending contract invites with newly created users
 */
export const linkInvitesOnUserCreate = onUserCreated(async event => {
  const user = event.data;
  if (!user?.email) {
    return;
  }

  const db = getFirestore();

  const pending = await db
    .collection('contract_access')
    .where('email', '==', user.email)
    .where('userId', '==', '')
    .get();

  if (pending.empty) {
    return;
  }

  const batch = db.batch();
  pending.docs.forEach(doc => {
    batch.update(doc.ref, { userId: user.uid });
  });

  await batch.commit();
});
