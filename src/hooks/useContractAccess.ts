import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchContractsWithAccess,
  grantContractAccess,
  revokeContractAccess,
  getContractAccessList,
  updateContractAccess,
} from '@/firebase/contractAccessServices.client';
import type {
  ContractWithAccess,
  ContractListQuery,
  ContractListResponse,
  ContractAccess,
  AccessLevel,
  Permission,
} from '../../shared/types/access-control';

interface UseContractAccessReturn {
  // Data
  contracts: ContractWithAccess[];
  totalCount: number;
  currentPage: number;
  totalPages: number;

  // Loading states
  loading: boolean;
  sharing: boolean;
  updating: boolean;

  // Error states
  error: string | null;

  // Actions
  loadContracts: (params?: Partial<ContractListQuery>) => Promise<void>;
  shareContract: (params: {
    contractId: string;
    userEmails: string[];
    accessLevel: AccessLevel;
    permissions: Permission[];
    message?: string;
  }) => Promise<{ success: boolean; results: any[] }>;
  revokeAccess: (params: {
    contractId: string;
    userIds: string[];
  }) => Promise<{ success: boolean; revokedCount: number }>;
  updateAccess: (params: {
    contractId: string;
    targetUserId: string;
    accessLevel: AccessLevel;
    permissions: Permission[];
  }) => Promise<{ success: boolean }>;
  getAccessList: (contractId: string) => Promise<ContractAccess[]>;

  // Utility functions
  canUserPerformAction: (
    contract: ContractWithAccess,
    action: string
  ) => boolean;
  hasPermission: (
    contract: ContractWithAccess,
    permission: Permission
  ) => boolean;

  // Filters and pagination
  setFilters: (filters: Partial<ContractListQuery>) => void;
  setPage: (page: number) => void;
  refreshContracts: () => Promise<void>;
}

export const useContractAccess = (): UseContractAccessReturn => {
  const { currentUser } = useAuth();

  // State
  const [contracts, setContracts] = useState<ContractWithAccess[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Partial<ContractListQuery>>({});

  // Load contracts with access control
  const loadContracts = useCallback(
    async (params?: Partial<ContractListQuery>) => {
      if (!currentUser) return;

      setLoading(true);
      setError(null);

      try {
        const queryParams: Partial<ContractListQuery> = {
          page: currentPage,
          limit: 20,
          ...filters,
          ...params,
        };

        const response: ContractListResponse =
          await fetchContractsWithAccess(queryParams);

        setContracts(response.contracts);
        setTotalCount(response.totalCount);
        setTotalPages(
          Math.ceil(response.totalCount / (queryParams.limit || 20))
        );

        if (params?.page) {
          setCurrentPage(params.page);
        }
      } catch (err) {
        console.error('Error loading contracts:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load contracts'
        );
      } finally {
        setLoading(false);
      }
    },
    [currentUser, currentPage, filters]
  );

  // Share contract with users
  const shareContract = useCallback(
    async (params: {
      contractId: string;
      userEmails: string[];
      accessLevel: AccessLevel;
      permissions: Permission[];
      message?: string;
    }) => {
      setSharing(true);
      setError(null);

      try {
        const result = await grantContractAccess(params);

        // Refresh contracts to show updated access
        await loadContracts();

        return result;
      } catch (err) {
        console.error('Error sharing contract:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to share contract'
        );
        throw err;
      } finally {
        setSharing(false);
      }
    },
    [loadContracts]
  );

  // Revoke access from users
  const revokeAccess = useCallback(
    async (params: { contractId: string; userIds: string[] }) => {
      setUpdating(true);
      setError(null);

      try {
        const result = await revokeContractAccess(params);

        // Refresh contracts to show updated access
        await loadContracts();

        return result;
      } catch (err) {
        console.error('Error revoking access:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to revoke access'
        );
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [loadContracts]
  );

  // Update user access
  const updateAccess = useCallback(
    async (params: {
      contractId: string;
      targetUserId: string;
      accessLevel: AccessLevel;
      permissions: Permission[];
    }) => {
      setUpdating(true);
      setError(null);

      try {
        const result = await updateContractAccess(params);

        // Refresh contracts to show updated access
        await loadContracts();

        return result;
      } catch (err) {
        console.error('Error updating access:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to update access'
        );
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [loadContracts]
  );

  // Get access list for a contract
  const getAccessList = useCallback(
    async (contractId: string): Promise<ContractAccess[]> => {
      try {
        const result = await getContractAccessList(contractId);
        return result.accessList;
      } catch (err) {
        console.error('Error getting access list:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to get access list'
        );
        throw err;
      }
    },
    []
  );

  // Utility functions
  const canUserPerformAction = useCallback(
    (contract: ContractWithAccess, action: string): boolean => {
      const userAccess = contract.userAccess;
      if (!userAccess) return false;

      // Owner can do everything
      if (userAccess.accessLevel === 'owner') return true;

      // Check specific permission
      return userAccess.permissions.includes(action as Permission);
    },
    []
  );

  const hasPermission = useCallback(
    (contract: ContractWithAccess, permission: Permission): boolean => {
      return contract.userAccess?.permissions?.includes(permission) ?? false;
    },
    []
  );

  // Filter and pagination controls
  const setFilters = useCallback((newFilters: Partial<ContractListQuery>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refreshContracts = useCallback(() => {
    return loadContracts();
  }, [loadContracts]);

  // Load contracts when user changes or filters change
  useEffect(() => {
    if (currentUser) {
      loadContracts();
    }
  }, [currentUser, currentPage, filters, loadContracts]);

  return {
    // Data
    contracts,
    totalCount,
    currentPage,
    totalPages,

    // Loading states
    loading,
    sharing,
    updating,

    // Error states
    error,

    // Actions
    loadContracts,
    shareContract,
    revokeAccess,
    updateAccess,
    getAccessList,

    // Utility functions
    canUserPerformAction,
    hasPermission,

    // Filters and pagination
    setFilters,
    setPage,
    refreshContracts,
  };
};
