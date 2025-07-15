'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isUserAdmin, isUserAdminSync } from '@/lib/admin';
import { getClientAuth } from '@/lib/firebase';

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

  const checkAdminStatus = useCallback(async () => {
    if (!currentUser) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }

    try {
      setIsCheckingAdmin(true);
      
      // Get the actual Firebase user to check token claims
      const auth = getClientAuth();
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        // Get fresh token and check claims directly
        const tokenResult = await firebaseUser.getIdTokenResult();
        const adminStatus = tokenResult.claims.admin === true;
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsCheckingAdmin(false);
    }
  }, [currentUser]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

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
