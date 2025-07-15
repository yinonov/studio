import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set admin role for a user
export const setAdminRole = onCall(async request => {
  // Check if the caller has admin permissions
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerClaims = request.auth.token;
  if (!callerClaims.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can set admin roles'
    );
  }

  const { uid, isAdmin } = request.data;

  if (!uid || typeof isAdmin !== 'boolean') {
    throw new HttpsError(
      'invalid-argument',
      'Invalid uid or isAdmin parameter'
    );
  }

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {
      admin: isAdmin,
      role: isAdmin ? 'admin' : 'user',
    });

    logger.info(
      `Admin role ${isAdmin ? 'granted' : 'revoked'} for user ${uid}`
    );

    return {
      success: true,
      message: `Admin role ${isAdmin ? 'granted' : 'revoked'} successfully`,
    };
  } catch (error) {
    logger.error('Error setting admin role:', error);
    throw new HttpsError('internal', 'Failed to set admin role');
  }
});

// Get all users with their roles (admin only)
export const getAllUsersWithRoles = onCall(async request => {
  // Check if the caller has admin permissions
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerClaims = request.auth.token;
  if (!callerClaims.admin) {
    throw new HttpsError('permission-denied', 'Only admins can view all users');
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000); // Limit to 1000 users

    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      customClaims: userRecord.customClaims || {},
      isAdmin: userRecord.customClaims?.admin || false,
    }));

    return { users };
  } catch (error) {
    logger.error('Error fetching users:', error);
    throw new HttpsError('internal', 'Failed to fetch users');
  }
});

// Initialize the first admin user (run this once)
export const initializeFirstAdmin = onCall(async request => {
  const { adminEmail } = request.data;

  if (!adminEmail) {
    throw new HttpsError('invalid-argument', 'Admin email is required');
  }

  try {
    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(adminEmail);

    // Set admin claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin',
    });

    logger.info(`First admin initialized for ${adminEmail}`);

    return {
      success: true,
      message: `Admin role granted to ${adminEmail}`,
      uid: userRecord.uid,
    };
  } catch (error) {
    logger.error('Error initializing first admin:', error);
    throw new HttpsError('internal', 'Failed to initialize admin');
  }
});
