'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isUserAdmin, isUserAdminSync } from '@/lib/admin';

interface AdminContextType {
  isAdmin: boolean;
  isCheckingAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  const checkAdminStatus = async () => {
    if (!currentUser) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    try {
      setIsCheckingAdmin(true);
      const adminStatus = await isUserAdmin(currentUser);
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const refreshAdminStatus = async () => {
    await checkAdminStatus();
  };

  const value = {
    isAdmin,
    isCheckingAdmin,
    refreshAdminStatus,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

// Hook for components that need immediate admin check (without async)
export function useAdminSync() {
  const { currentUser } = useAuth();
  
  // Use synchronous check for immediate feedback
  const isAdmin = currentUser ? isUserAdminSync(currentUser) : false;
  
  return { isAdmin };
}
