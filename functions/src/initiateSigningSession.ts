import * as functions from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';

/**
 * [DEBUG STEP 1]
 * A mock function to test configuration access and deployment.
 * It reads the Dropbox Sign API key and Client ID from Firebase environment
 * configuration and returns them to the client.
 */
export const initiateSigningSession = functions.https.onCall(
  { region: 'us-central1' },
  (request) => {
    logger.info('[DEBUG] initiateSigningSession called.', { auth: request.auth, data: request.data });

    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    try {
      const apiKey = functions.config().dropbox_sign?.apikey;
      const clientId = functions.config().dropbox_sign?.clientid;

      logger.info('[DEBUG] Reading Firebase functions config...', {
        apiKeyFound: !!apiKey,
        clientIdFound: !!clientId,
      });

      if (!apiKey || !clientId) {
        logger.error('[DEBUG] Dropbox Sign API Key or Client ID is not configured in Firebase environment.');
        // Still return what we found so the client can see what's missing.
      }

      return {
        message: 'Debug step 1 successful: Configuration read.',
        apiKey: apiKey || 'Not Found',
        clientId: clientId || 'Not Found',
      };
    } catch (error: any) {
      logger.error('[DEBUG] Error reading functions.config()', error);
      throw new functions.https.HttpsError(
        'internal',
        'An error occurred while reading configuration.',
        error.message
      );
    }
  }
);
