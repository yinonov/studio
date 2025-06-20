
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  SignatureRequestApi,
  EmbeddedApi,
  type SignatureRequestCreateEmbeddedRequest,
  type ErrorResponseError,
} from "@dropbox/sign";

admin.initializeApp();

const dropboxSignApiKey = functions.config().dropbox_sign?.apikey;
const dropboxSignClientId = functions.config().dropbox_sign?.clientid;

// Initialize SDK instances globally
const signatureRequestApi = new SignatureRequestApi();
const embeddedApi = new EmbeddedApi();

if (!dropboxSignApiKey) {
  logger.error(`Dropbox Sign API key is not configured.
    Set with: firebase functions:config:set dropbox_sign.apikey="YOUR_API_KEY"`);
}
if (!dropboxSignClientId) {
  logger.error(`Dropbox Sign Client ID is not configured.
      Set with: firebase functions:config:set dropbox_sign.clientid="YOUR_CLIENT_ID"`);
}

/**
 * Initiates an embedded signing session with Dropbox Sign.
 */
export const initiateSigningSession = onCall(
  { cors: true }, 
  async (request) => {
    logger.info("initiateSigningSession called with data: ", request.data);

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    // Critical runtime checks for configuration
    if (!dropboxSignApiKey) {
      logger.error("Dropbox Sign API key is missing in function configuration at runtime.");
      throw new HttpsError(
        "internal",
        "E-signature service is not configured correctly. API key missing."
      );
    }
    if (!dropboxSignClientId) {
      logger.error(
        "Dropbox Sign Client ID is missing in function configuration at runtime."
      );
      throw new HttpsError(
        "internal",
        "E-signature service is not configured correctly. Client ID missing."
      );
    }

    // Configure SDK instances with the API key now that we know it exists
    signatureRequestApi.username = dropboxSignApiKey;
    embeddedApi.username = dropboxSignApiKey;

    const contractId = request.data.contractId;
    if (!contractId || typeof contractId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with a valid 'contractId'."
      );
    }

    const userId = request.auth.uid;

    let contractData;
    let signerEmail: string | undefined;
    let contractTitle: string | undefined;

    try {
      const contractDoc = await admin
        .firestore()
        .collection("contracts")
        .doc(contractId)
        .get();
      if (!contractDoc.exists) {
        throw new HttpsError(
          "not-found",
          `Contract with ID ${contractId} not found.`
        );
      }
      contractData = contractDoc.data();
      if (!contractData) {
        throw new HttpsError(
          "internal",
          `Failed to read data for contract ${contractId}.`
        );
      }

      contractTitle = contractData.title || `Contract ${contractId}`;
      if (
        contractData.parties &&
        contractData.parties.length > 0 &&
        contractData.parties[0].email
      ) {
        signerEmail = contractData.parties[0].email;
      } else {
        signerEmail = request.auth.token.email;
        if (!signerEmail) {
          throw new HttpsError(
            "invalid-argument",
            "Signer email is not available for the contract or the initiator."
          );
        }
        logger.warn(
          `No specific party email found for contract ${contractId}. Using initiator's email: ${signerEmail}`
        );
      }
    } catch (error: any) {
      logger.error(
        `Error fetching contract ${contractId} from Firestore:`,
        error
      );
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        `Failed to fetch contract details: ${error.message}`
      );
    }

    const placeholderDocumentUrl =
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

    const signatureRequestData: SignatureRequestCreateEmbeddedRequest = {
      clientId: dropboxSignClientId,
      title: contractTitle,
      subject: `Please sign: ${contractTitle}`,
      message: `Please review and sign the document: ${contractTitle}. Initiated by user ${userId}.`,
      signers: [
        {
          emailAddress: signerEmail as string, 
          name: contractData?.parties?.[0]?.name || "Signer",
        },
      ],
      fileUrls: [placeholderDocumentUrl],
      metadata: {
        contractId: contractId,
        userId: userId,
      },
      testMode: true,
    };

    try {
      logger.info(
        "Sending signature request to Dropbox Sign with data:",
        JSON.stringify({
          ...signatureRequestData,
          signers: (signatureRequestData.signers || []).map((s) => ({ // Safely map signers
            ...s,
            emailAddress: "[REDACTED]",
          })),
        })
      );

      const result = await signatureRequestApi.signatureRequestCreateEmbedded(
        signatureRequestData
      );
      const signatureRequestDetails = result.body.signatureRequest;

      if (!signatureRequestDetails?.signatures?.[0]?.signatureId) {
        logger.error(
          "Failed to get signatureId from Dropbox Sign response:",
          result.body
        );
        throw new Error("Dropbox Sign response did not include a signature ID.");
      }
      const signatureId = signatureRequestDetails.signatures[0].signatureId;

      logger.info(`Signature request created: ${signatureRequestDetails.signatureRequestId},
      signature_id for signer 0: ${signatureId}`);

      const embeddedResponse = await embeddedApi.embeddedSignUrl(signatureId);
      const signUrl = embeddedResponse.body.embedded?.signUrl;

      if (!signUrl) {
        logger.error(
          "Failed to get embedded sign_url from Dropbox Sign:",
          embeddedResponse.body
        );
        throw new Error(
          "Could not retrieve the embedded signing URL from Dropbox Sign."
        );
      }

      logger.info(
        `Successfully generated Dropbox Sign embedded URL for contract ${contractId}.`
      );

      await admin.firestore().collection("contracts").doc(contractId).set(
        {
          dropboxSignRequestId: signatureRequestDetails.signatureRequestId,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { signingUrl: signUrl };
    } catch (apiError: any) {
      let errorMessage =
        "Failed to initiate signing session with the e-signature provider.";
      if (
        apiError.body &&
        apiError.body.error &&
        (apiError.body.error as ErrorResponseError).errorMsg
      ) {
        errorMessage = `E-signature provider error: ${
          (apiError.body.error as ErrorResponseError).errorMsg
        }`;
        logger.error(
          "Dropbox Sign API call failed:",
          apiError.body.error as ErrorResponseError
        );
      } else if (
        apiError.response &&
        apiError.response.data &&
        apiError.response.data.error &&
        apiError.response.data.error.error_msg
      ) {
        errorMessage = `E-signature provider error: ${apiError.response.data.error.error_msg}`;
        logger.error(
          "Dropbox Sign API call failed (axios-like error):",
          apiError.response.data
        );
      } else if (apiError.message) {
        errorMessage = `E-signature provider error: ${apiError.message}`;
        logger.error(
          "Dropbox Sign API call failed (generic):",
          apiError.message,
          apiError
        );
      } else {
        logger.error(
          "Dropbox Sign API call failed (unknown structure):",
          apiError
        );
      }
      throw new HttpsError("internal", errorMessage);
    }
  }
);
