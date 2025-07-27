import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  type Timestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import type {
  ContractAccess,
  Contract,
  AccessLevel,
  Permission,
  ContractWithAccess,
  ContractListQuery,
  ContractListResponse,
} from '../../shared/types/access-control';

// Enhanced contract services with access control

/**
 * Fetch contracts for a user with proper access control
 * This replaces the simple ownerId query with contract_access collection queries
 */
export const fetchContractsForUserWithAccess = async (
  userId: string,
  queryParams: Partial<ContractListQuery> = {}
): Promise<ContractListResponse> => {
  if (!userId) {
    throw new Error('User ID is required to fetch contracts.');
  }

  const db = getClientDb();
  const {
    page = 1,
    limit: pageLimit = 20,
    status,
    accessLevel,
    sortBy = 'lastUpdatedAt',
    sortOrder = 'desc',
  } = queryParams;

  try {
    // Step 1: Query contract_access collection to get all contracts this user has access to
    let accessQuery = query(
      collection(db, 'contract_access'),
      where('userId', '==', userId)
    );

    // Filter by access level if specified
    if (accessLevel && accessLevel.length > 0) {
      accessQuery = query(accessQuery, where('accessLevel', 'in', accessLevel));
    }

    const accessSnapshot = await getDocs(accessQuery);
    const contractIds = accessSnapshot.docs.map(doc => doc.data().contractId);
    const accessMap = new Map<string, ContractAccess>();

    // Build access map for quick lookup
    accessSnapshot.docs.forEach(doc => {
      const access = doc.data() as ContractAccess;
      accessMap.set(access.contractId, access);
    });

    if (contractIds.length === 0) {
      return { contracts: [], totalCount: 0 };
    }

    // Step 2: Fetch contracts in batches (Firestore limit is 10 IDs per 'in' query)
    const allContracts: ContractWithAccess[] = [];
    const batchSize = 10;

    for (let i = 0; i < contractIds.length; i += batchSize) {
      const batch = contractIds.slice(i, i + batchSize);
      let contractsQuery = query(
        collection(db, 'contracts'),
        where('__name__', 'in', batch)
      );

      // Apply status filter if specified
      if (status && status.length > 0) {
        contractsQuery = query(contractsQuery, where('status', 'in', status));
      }

      const contractsSnapshot = await getDocs(contractsQuery);
      const batchContracts = contractsSnapshot.docs.map(contractDoc => {
        const contractData = contractDoc.data() as Contract;
        const userAccess = accessMap.get(contractDoc.id);

        return {
          ...contractData,
          id: contractDoc.id,
          userAccess: userAccess
            ? {
                accessLevel: userAccess.accessLevel,
                permissions: userAccess.permissions,
              }
            : {
                accessLevel: 'viewer' as AccessLevel,
                permissions: ['view'] as Permission[],
              },
        };
      });

      allContracts.push(...batchContracts);
    }

    // Step 3: Sort results (client-side for now, can be optimized with search service)
    allContracts.sort((a, b) => {
      const aValue = a[sortBy as keyof Contract];
      const bValue = b[sortBy as keyof Contract];

      if (sortBy === 'createdAt' || sortBy === 'lastUpdatedAt') {
        const aTime = (aValue as any)?.seconds || 0;
        const bTime = (bValue as any)?.seconds || 0;
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      }

      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      const comparison = aStr.localeCompare(bStr);
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Step 4: Apply pagination
    const startIndex = (page - 1) * pageLimit;
    const endIndex = startIndex + pageLimit;
    const paginatedContracts = allContracts.slice(startIndex, endIndex);

    return {
      contracts: paginatedContracts,
      totalCount: allContracts.length,
      pageToken: endIndex < allContracts.length ? String(page + 1) : undefined,
    };
  } catch (error) {
    console.error('Error fetching contracts with access control:', error);
    throw error;
  }
};

/**
 * Real-time listener for contracts with access control
 */
export const subscribeToUserContracts = (
  userId: string,
  callback: (contracts: ContractWithAccess[]) => void,
  onError: (error: Error) => void
) => {
  if (!userId) {
    onError(new Error('User ID is required to subscribe to contracts.'));
    return () => {};
  }

  const db = getClientDb();

  // Listen to changes in contract_access for this user
  const accessQuery = query(
    collection(db, 'contract_access'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    accessQuery,
    async accessSnapshot => {
      try {
        const contractIds = accessSnapshot.docs.map(
          doc => doc.data().contractId
        );
        const accessMap = new Map<string, ContractAccess>();

        accessSnapshot.docs.forEach(doc => {
          const access = doc.data() as ContractAccess;
          accessMap.set(access.contractId, access);
        });

        if (contractIds.length === 0) {
          callback([]);
          return;
        }

        // Fetch contracts in batches
        const allContracts: ContractWithAccess[] = [];
        const batchSize = 10;

        for (let i = 0; i < contractIds.length; i += batchSize) {
          const batch = contractIds.slice(i, i + batchSize);
          const contractsQuery = query(
            collection(db, 'contracts'),
            where('__name__', 'in', batch)
          );

          const contractsSnapshot = await getDocs(contractsQuery);
          const batchContracts = contractsSnapshot.docs.map(contractDoc => {
            const contractData = contractDoc.data() as Contract;
            const userAccess = accessMap.get(contractDoc.id);

            return {
              ...contractData,
              id: contractDoc.id,
              userAccess: userAccess
                ? {
                    accessLevel: userAccess.accessLevel,
                    permissions: userAccess.permissions,
                  }
                : {
                    accessLevel: 'viewer' as AccessLevel,
                    permissions: ['view'] as Permission[],
                  },
            };
          });

          allContracts.push(...batchContracts);
        }

        callback(allContracts);
      } catch (error) {
        onError(error as Error);
      }
    },
    error => {
      console.error('Error in contract subscription:', error);
      onError(error);
    }
  );
};

/**
 * Grant access to a contract for a specific user
 */
export const grantContractAccess = async (
  contractId: string,
  userId: string,
  accessLevel: AccessLevel,
  permissions: Permission[],
  grantedBy: string,
  userEmail?: string,
  userName?: string
): Promise<void> => {
  const db = getClientDb();

  const accessData: Omit<ContractAccess, 'id'> = {
    contractId,
    userId,
    accessLevel,
    permissions,
    grantedBy,
    grantedAt: serverTimestamp() as Timestamp,
    email: userEmail,
    name: userName,
  };

  await addDoc(collection(db, 'contract_access'), accessData);
};

/**
 * Revoke access to a contract for a specific user
 */
export const revokeContractAccess = async (
  contractId: string,
  userId: string
): Promise<void> => {
  const db = getClientDb();

  const accessQuery = query(
    collection(db, 'contract_access'),
    where('contractId', '==', contractId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(accessQuery);
  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

/**
 * Get all users who have access to a specific contract
 */
export const getContractAccessList = async (
  contractId: string
): Promise<ContractAccess[]> => {
  const db = getClientDb();

  const accessQuery = query(
    collection(db, 'contract_access'),
    where('contractId', '==', contractId)
  );

  const snapshot = await getDocs(accessQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ContractAccess[];
};

/**
 * Update user's permissions for a specific contract
 */
export const updateContractAccess = async (
  contractId: string,
  userId: string,
  updates: Partial<Pick<ContractAccess, 'accessLevel' | 'permissions'>>
): Promise<void> => {
  const db = getClientDb();

  const accessQuery = query(
    collection(db, 'contract_access'),
    where('contractId', '==', contractId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(accessQuery);

  if (snapshot.empty) {
    throw new Error('Access record not found');
  }

  const accessDoc = snapshot.docs[0];
  await setDoc(
    accessDoc.ref,
    {
      ...updates,
      lastUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Create contract with automatic owner access
 */
export const createContractWithAccess = async (
  contractData: Omit<Contract, 'id' | 'createdAt' | 'lastUpdatedAt'>,
  signerEmails: string[] = []
): Promise<string> => {
  const db = getClientDb();
  const batch = writeBatch(db);

  // Create contract
  const contractRef = doc(collection(db, 'contracts'));
  const contractId = contractRef.id;

  batch.set(contractRef, {
    ...contractData,
    id: contractId,
    createdAt: serverTimestamp(),
    lastUpdatedAt: serverTimestamp(),
  });

  // Grant owner access
  const ownerAccessRef = doc(collection(db, 'contract_access'));
  batch.set(ownerAccessRef, {
    contractId,
    userId: contractData.ownerId,
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
    grantedBy: contractData.ownerId,
    grantedAt: serverTimestamp(),
  });

  // Grant signer access to designated signers
  signerEmails.forEach(email => {
    if (email && email !== '') {
      const signerAccessRef = doc(collection(db, 'contract_access'));
      batch.set(signerAccessRef, {
        contractId,
        userId: '', // Will be updated when user signs up/logs in
        email,
        accessLevel: 'signer',
        permissions: ['view', 'sign'],
        grantedBy: contractData.ownerId,
        grantedAt: serverTimestamp(),
      });
    }
  });

  await batch.commit();
  return contractId;
};

// Backward compatibility wrapper for existing code
export const fetchContractsForUser = (
  userId: string,
  callback: (contracts: Contract[]) => void,
  onError: (error: Error) => void
) => {
  return subscribeToUserContracts(
    userId,
    contracts => {
      // Convert to old format for backward compatibility
      const oldFormatContracts = contracts.map(contract => ({
        ...contract,
        // Add any missing fields for backward compatibility
        sharedWith: [], // Empty since we're using access control now
      })) as Contract[];
      callback(oldFormatContracts);
    },
    onError
  );
};
