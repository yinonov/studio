import { httpsCallable } from 'firebase/functions';
import { getClientFunctions } from '@/lib/firebase';

const functions = getClientFunctions();

export interface UserDetails {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  disabled: boolean;
  customClaims: Record<string, any>;
  role?: 'admin' | 'manager' | 'member' | 'viewer';
  metadata: {
    creationTime: string;
    lastSignInTime?: string;
  };
}

export interface ListUsersResponse {
  users: UserDetails[];
  pageToken?: string;
}

// Set user role (admin only)
export const setUserRole = async (
  targetUid: string,
  role: 'admin' | 'manager' | 'member' | 'viewer'
) => {
  const callable = httpsCallable(functions, 'setUserRole');
  const result = await callable({ targetUid, role });
  return result.data;
};

// Get detailed user information (admin only)
export const getUserDetails = async (
  targetUid: string
): Promise<UserDetails> => {
  const callable = httpsCallable(functions, 'getUserDetails');
  const result = await callable({ targetUid });
  return result.data as UserDetails;
};

// List all users with pagination (admin only)
export const listUsers = async (
  pageToken?: string,
  maxResults?: number
): Promise<ListUsersResponse> => {
  const callable = httpsCallable(functions, 'listUsers');
  const result = await callable({ pageToken, maxResults });
  return result.data as ListUsersResponse;
};

// Make yourself admin (for initial setup only)
export const makeInitialAdmin = async (confirmEmail: string) => {
  const callable = httpsCallable(functions, 'makeInitialAdmin');
  const result = await callable({ confirmEmail });
  return result.data;
};
