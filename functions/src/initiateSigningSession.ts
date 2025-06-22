import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

export const initiateSigningSession = functions.https.onCall(async (data, context) => {
  // Authentication check (optional but recommended for sensitive operations)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const contractId = data.contractId;

  if (!contractId || typeof contractId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with a valid contractId in the request body.'
    );
  }

  try {
    const contractRef = db.collection('contracts').doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Contract with ID ${contractId} not found.`);
    }

    // Update contract status to 'sentForSigning'
    await contractRef.update({
      status: 'sentForSigning',
      sentForSigningAt: admin.firestore.FieldValue.serverTimestamp(),
      // Placeholder for signing URL generation if needed later
      // signingUrl: 'placeholder_signing_url'
    });

    functions.logger.info(`Signing session initiated for contract: ${contractId}`, { contractId, userId: context.auth.uid });

    return { success: true, message: `Signing session initiated for contract ${contractId}.` };

  } catch (error) {
    functions.logger.error('Error initiating signing session:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while initiating the signing session.',
      error
    );
  }
});