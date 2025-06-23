import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { EmbeddedApi } from "@dropbox/sign";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export const getEmbeddedSignUrlForCurrentUser = onCall(
  { region: "us-central1" },
  async (request) => {
    logger.info("getEmbeddedSignUrlForCurrentUser called with data: ", request.data);

    if (!request.auth || !request.auth.token.email) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated with an email.");
    }

    const { contractId } = request.data;
    if (!contractId || typeof contractId !== "string") {
      throw new HttpsError("invalid-argument", "The function must be called with a valid 'contractId'.");
    }

    const dropboxSignApiKey = process.env.DROPBOX_SIGN_API_KEY;
    const dropboxSignClientId = process.env.DROPBOX_SIGN_CLIENT_ID;

    if (!dropboxSignApiKey || !dropboxSignClientId) {
      logger.error("Dropbox Sign API key or Client ID is not configured.");
      throw new HttpsError(
        "failed-precondition",
        "The Dropbox Sign integration is not configured on the server."
      );
    }

    const embeddedApi = new EmbeddedApi();
    embeddedApi.username = dropboxSignApiKey;
    
    try {
      const contractRef = db.collection("contracts").doc(contractId);
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new HttpsError("not-found", "Contract not found.");
      }
      const contractData = contractDoc.data();
      if (!contractData || !contractData.parties) {
          throw new HttpsError("failed-precondition", "Contract data or parties are missing.");
      }
      
      const currentUserEmail = request.auth.token.email.toLowerCase();
      const currentUserParty = contractData.parties.find(
          (p: any) => p.email.toLowerCase() === currentUserEmail
      );

      if (!currentUserParty) {
          throw new HttpsError("permission-denied", "You are not a party to this contract.");
      }
      if (currentUserParty.status === 'signed') {
           throw new HttpsError("failed-precondition", "You have already signed this contract.");
      }
      if (!currentUserParty.signatureId) {
          throw new HttpsError("failed-precondition", "Signature ID not found for this user. The contract may not have been sent for signing correctly.");
      }

      const embeddedResponse = await embeddedApi.embeddedSignUrl(currentUserParty.signatureId);
      const signUrl = embeddedResponse.body.embedded?.signUrl;

      if (!signUrl) {
        throw new Error("Failed to get embedded signing URL from Dropbox Sign.");
      }

      logger.info("Successfully generated embedded sign URL for user.", { contractId, userEmail: currentUserEmail });
      
      return { signUrl, clientId: dropboxSignClientId };

    } catch (error: any) {
      logger.error("Error generating signing URL:", {
        contractId,
        error: error.response ? error.response.body : error.message,
      });
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while generating the signing URL.",
        error.message
      );
    }
  }
);
