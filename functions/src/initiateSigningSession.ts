
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { SignatureRequestApi, EmbeddedApi, SubSignatureRequestSigner } from '@dropbox/sign';
import { config as functionsConfig } from 'firebase-functions';

// Initialize Firebase Admin SDK only if it hasn't been already
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

export const initiateSigningSession = onCall(
  { region: "us-central1" },
  async (request) => {
    logger.info("initiateSigningSession called with data: ", request.data);

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { contractId } = request.data;
  if (!contractId || typeof contractId !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      "The function must be called with a valid 'contractId'."
    );
  }

  const dropboxSignApiKey = functionsConfig().dropbox_sign?.apikey;
  const dropboxSignClientId = functionsConfig().dropbox_sign?.clientid;

  if (!dropboxSignApiKey || !dropboxSignClientId) {
    logger.error("Dropbox Sign API key or Client ID is not configured in Firebase environment.");
    throw new HttpsError(
      'failed-precondition',
      'The Dropbox Sign integration is not configured on the server. Please check function configuration.'
    );
  }

  try {
    // 1. Fetch contract data from Firestore
    const contractRef = db.collection('contracts').doc(contractId);
    const contractDoc = await contractRef.get();
    if (!contractDoc.exists) {
      throw new HttpsError('not-found', 'Contract not found.');
    }
    const contractData = contractDoc.data();
    if (!contractData) {
      throw new HttpsError('internal', 'Contract data is empty.');
    }
    logger.info("Successfully fetched contract data:", { contractId, title: contractData.title });

    // 2. Prepare the signers
    if (!contractData.parties || contractData.parties.length === 0) {
      throw new HttpsError('failed-precondition', 'Contract has no parties/signers defined.');
    }
    const signers: SubSignatureRequestSigner[] = contractData.parties.map((party: any, index: number) => ({
      name: party.name,
      emailAddress: party.email,
      order: index,
    }));
    logger.info("Prepared signers:", { signers });

    // 3. Prepare the request data
    const signatureRequestData = {
      clientId: dropboxSignClientId,
      title: contractData.title || 'Contract for Signature',
      subject: `Signature Request: ${contractData.title || 'Contract'}`,
      message: 'Please review and sign the document.',
      signers,
      fileUrls: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'], // Using a placeholder PDF
      testMode: true,
    };
    logger.info("Prepared signature request data for Dropbox Sign API.");

    // 4. Call Dropbox Sign to create the signature request
    const signatureRequestApi = new SignatureRequestApi();
    signatureRequestApi.username = dropboxSignApiKey;

    const response = await signatureRequestApi.signatureRequestCreateEmbedded(signatureRequestData);
    const signatureRequest = response.body.signatureRequest;
    
    if (!signatureRequest || !signatureRequest.signatures) {
        throw new Error("Invalid response from Dropbox Sign: Missing signature request or signatures.");
    }
    logger.info("Successfully created embedded signature request.", { signatureRequestId: signatureRequest.signatureRequestId });
    
    // 5. Get the signature ID for the first signer to generate the embedded URL
    // In a multi-signer flow, you'd generate a URL for each signer as it becomes their turn.
    const firstSignatureId = signatureRequest.signatures[0]?.signatureId;
    if (!firstSignatureId) {
      throw new Error('Could not get signature ID for the first signer.');
    }
    logger.info("Retrieved signature ID for the first signer:", { firstSignatureId });

    const embeddedApi = new EmbeddedApi();
    embeddedApi.username = dropboxSignApiKey;

    const embeddedResponse = await embeddedApi.embeddedSignUrl(firstSignatureId);
    const signingUrl = embeddedResponse.body.embedded?.signUrl;

    if (!signingUrl) {
      throw new Error('Failed to get embedded signing URL.');
    }
    logger.info("Successfully generated embedded sign URL.", { contractId });

    if (!dropboxSignApiKey || !dropboxSignClientId) {
      logger.error(
        "Dropbox Sign API key or Client ID is not configured in Firebase environment."
      );
      throw new HttpsError(
        "failed-precondition",
        "The Dropbox Sign integration is not configured on the server."
      );
    }

    try {
      // 1. Fetch contract data from Firestore
      const contractRef = db.collection("contracts").doc(contractId);
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new HttpsError("not-found", "Contract not found.");
      }
      const contractData = contractDoc.data();
      if (!contractData) {
        throw new HttpsError("internal", "Contract data is empty.");
      }
      logger.info("Successfully fetched contract data:", {
        contractId,
        title: contractData.title,
      });

      // 2. Prepare the signers
      if (!contractData.parties || contractData.parties.length === 0) {
        throw new HttpsError(
          "failed-precondition",
          "Contract has no parties/signers defined."
        );
      }
      const signers: SubSignatureRequestSigner[] = contractData.parties.map(
        (party: any, index: number) => ({
          name: party.name,
          emailAddress: party.email,
          order: index,
        })
      );
      logger.info("Prepared signers:", { signers });

      // 3. Prepare the request data
      const signatureRequestData = {
        clientId: dropboxSignClientId,
        title: contractData.title || "Contract for Signature",
        subject: `Signature Request: ${contractData.title || "Contract"}`,
        message: "Please review and sign the document.",
        signers,
        fileUrls: [
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        ],
        testMode: true,
      };
      logger.info("Prepared signature request data for Dropbox Sign API.");

      // 4. Call Dropbox Sign to create the signature request
      const signatureRequestApi = new SignatureRequestApi();
      signatureRequestApi.username = dropboxSignApiKey;

      const response = await signatureRequestApi.signatureRequestCreateEmbedded(
        signatureRequestData
      );
      const signatureRequest = response.body.signatureRequest;

      if (!signatureRequest || !signatureRequest.signatures) {
        throw new Error(
          "Invalid response from Dropbox Sign: Missing signature request or signatures."
        );
      }

      logger.info("Successfully created embedded signature request.", {
        signatureRequestId: signatureRequest.signatureRequestId,
      });

      const firstSignatureId = signatureRequest.signatures[0]?.signatureId;
      if (!firstSignatureId) {
        throw new Error("Could not get signature ID for the first signer.");
      }
      logger.info("Retrieved signature ID for the first signer:", {
        firstSignatureId,
      });

      const embeddedApi = new EmbeddedApi();
      embeddedApi.username = dropboxSignApiKey;

      const embeddedResponse = await embeddedApi.embeddedSignUrl(
        firstSignatureId
      );
      const signingUrl = embeddedResponse.body.embedded?.signUrl;

      if (!signingUrl) {
        throw new Error("Failed to get embedded signing URL.");
      }

      logger.info("Successfully generated embedded sign URL.", { contractId });

      // 6. Update the contract in Firestore with the signing URL and status
      await contractRef.update({
        signingUrl: signingUrl,
        status: "pending",
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info(
        "Updated contract in Firestore with signing URL and pending status.",
        { contractId }
      );

      return { signingUrl };
    } catch (error: any) {
      logger.error("Error during Dropbox Sign process:", {
        contractId,
        error: error.response ? error.response.body : error.message,
      });
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while initiating the signing session.",
        error.message
      );
    }
  }
);
