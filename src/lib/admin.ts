import type { User } from 'firebase/auth';
import type { UserSchema } from '@/types';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

/**
 * Check if a user has admin privileges using Firebase custom claims
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
      return tokenResult.claims.admin === true;
    }

    // For UserSchema objects, check customClaims
    if ('customClaims' in user && user.customClaims) {
      return user.customClaims.admin === true;
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
  
  // Check if user has custom claims already loaded
  if (user.customClaims?.admin === true) return true;
  
  // Fallback: check if this is a token result with claims
  if (user.claims?.admin === true) return true;
  
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
 * Set admin role for a user (requires admin permissions)
 * @param uid - User ID to grant/revoke admin
 * @param isAdmin - Whether to grant or revoke admin role
 */
export const setUserAdminRole = async (
  uid: string,
  isAdmin: boolean
): Promise<void> => {
  const functions = getFunctions();
  const setAdminRole = httpsCallable(functions, 'setAdminRole');
  
  try {
    await setAdminRole({ uid, isAdmin });
  } catch (error) {
    console.error('Error setting admin role:', error);
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
