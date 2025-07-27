import type { User } from 'firebase/auth';
import type { UserSchema } from '@/types';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

/**
 * Check if a user has admin privileges using Firebase custom claims (role-based)
 * @param user - Firebase user object or custom user schema
 * @returns boolean indicating if user is admin
 */
export const isUserAdmin = async (
  user: User | UserSchema | null
): Promise<boolean> => {
  if (!user) return false;

  try {
    // For Firebase User objects, get fresh token to check custom claims
    if ('getIdTokenResult' in user) {
      const tokenResult = await user.getIdTokenResult();
      return tokenResult.claims.role === 'admin';
    }

    // For UserSchema objects, check role directly
    if ('role' in user) {
      return user.role === 'admin';
    }

    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Synchronous version that checks custom claims from already-loaded token
 * @param user - Firebase user object with custom claims
 * @returns boolean indicating if user is admin
 */
export const isUserAdminSync = (user: any): boolean => {
  if (!user) return false;

  // Check if user has role claim
  if (user.role === 'admin') return true;

  // Fallback: check if this is a token result with claims
  if (user.claims?.role === 'admin') return true;

  return false;
};

/**
 * Get display name for admin area
 * @param user - Firebase user object or custom user schema
 * @returns string with user display name
 */
export const getAdminDisplayName = (user: User | UserSchema | null): string => {
  if (!user) return 'משתמש';
  return (
    user.displayName ||
    user.email ||
    ('phoneNumber' in user ? user.phoneNumber : null) ||
    'מנהל'
  );
};

/**
 * Set user role (requires admin permissions)
 * @param uid - User ID to set role for
 * @param role - Role to assign ('admin', 'manager', 'member', 'viewer')
 */
export const setUserRole = async (
  uid: string,
  role: 'admin' | 'manager' | 'member' | 'viewer'
): Promise<void> => {
  const functions = getFunctions();
  const setRole = httpsCallable(functions, 'setUserRole');

  try {
    await setRole({ uid, role });
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
};

/**
 * Get all users with their roles (admin only)
 */
export const getAllUsersWithRoles = async (): Promise<any[]> => {
  const functions = getFunctions();
  const getAllUsers = httpsCallable(functions, 'getAllUsersWithRoles');

  try {
    const result = await getAllUsers();
    return (result.data as any).users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Initialize the first admin user
 * @param adminEmail - Email of the user to make admin
 */
export const initializeFirstAdmin = async (
  adminEmail: string
): Promise<void> => {
  const functions = getFunctions();
  const initAdmin = httpsCallable(functions, 'initializeFirstAdmin');

  try {
    await initAdmin({ adminEmail });
  } catch (error) {
    console.error('Error initializing admin:', error);
    throw error;
  }
};
