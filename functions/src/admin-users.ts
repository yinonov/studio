import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// Helper function to check if user is admin
async function checkAdminAccess(uid: string): Promise<void> {
  const userRecord = await admin.auth().getUser(uid);
  const customClaims = userRecord.customClaims;

  if (!customClaims?.admin) {
    throw new HttpsError(
      'permission-denied',
      'Access denied. Admin privileges required.'
    );
  }
}

// Set admin status for a user
export const setAdminStatus = onCall(
  { region: 'us-central1' },
  async request => {
    // Check if the caller is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check if the caller has admin privileges
    await checkAdminAccess(request.auth.uid);

    const { targetUid, isAdmin } = request.data;

    if (!targetUid || typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'Target UID is required');
    }

    if (typeof isAdmin !== 'boolean') {
      throw new HttpsError('invalid-argument', 'isAdmin must be a boolean');
    }

    try {
      // Set custom claims
      await admin.auth().setCustomUserClaims(targetUid, { admin: isAdmin });

      return {
        success: true,
        message: `Admin status ${isAdmin ? 'granted' : 'revoked'} for user ${targetUid}`,
      };
    } catch (error) {
      console.error('Error setting admin status:', error);
      throw new HttpsError('internal', 'Failed to set admin status');
    }
  }
);

// Get user details (admin only)
export const getUserDetails = onCall(
  { region: 'us-central1' },
  async request => {
    // Check if the caller is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check if the caller has admin privileges
    await checkAdminAccess(request.auth.uid);

    const { targetUid } = request.data;

    if (!targetUid || typeof targetUid !== 'string') {
      throw new HttpsError('invalid-argument', 'Target UID is required');
    }

    try {
      const userRecord = await admin.auth().getUser(targetUid);

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        customClaims: userRecord.customClaims || {},
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw new HttpsError('internal', 'Failed to get user details');
    }
  }
);

// List all users (admin only, with pagination)
export const listUsers = onCall({ region: 'us-central1' }, async request => {
  // Check if the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Check if the caller has admin privileges
  await checkAdminAccess(request.auth.uid);

  const { pageToken, maxResults = 100 } = request.data;

  try {
    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);

    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      phoneNumber: userRecord.phoneNumber,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      customClaims: userRecord.customClaims || {},
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
    }));

    return {
      users,
      pageToken: listUsersResult.pageToken,
    };
  } catch (error) {
    console.error('Error listing users:', error);
    throw new HttpsError('internal', 'Failed to list users');
  }
});

// Make yourself admin (for initial setup only - should be removed in production)
export const makeInitialAdmin = onCall(
  { region: 'us-central1' },
  async request => {
    // Check if the caller is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { confirmEmail } = request.data;
    const userUid = request.auth.uid;

    try {
      // Get current user details
      const userRecord = await admin.auth().getUser(userUid);

      // Basic validation - you can add more security checks here
      if (!confirmEmail || confirmEmail !== userRecord.email) {
        throw new HttpsError(
          'invalid-argument',
          'Email confirmation required for security'
        );
      }

      // Check if user already has admin claims
      if (userRecord.customClaims?.admin) {
        return {
          success: true,
          message: 'User already has admin privileges',
          alreadyAdmin: true,
        };
      }

      // Set admin claims
      await admin.auth().setCustomUserClaims(userUid, { admin: true });

      return {
        success: true,
        message: 'Admin privileges granted successfully',
        alreadyAdmin: false,
      };
    } catch (error) {
      console.error('Error making initial admin:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'Failed to grant admin privileges');
    }
  }
);
