import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { SignatureRequestApi } from "@dropbox/sign";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export const refreshContractStatus = onCall({ region: "us-central1" }, async (request) => {
  logger.info("refreshContractStatus called with data: ", request.data);

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { contractId } = request.data;
  if (!contractId || typeof contractId !== "string") {
    throw new HttpsError("invalid-argument", "The function must be called with a valid 'contractId'.");
  }

  const dropboxSignApiKey = process.env.DROPBOX_SIGN_API_KEY;
  if (!dropboxSignApiKey) {
    logger.error("Dropbox Sign API key is not configured.");
    throw new HttpsError("failed-precondition", "The Dropbox Sign integration is not configured.");
  }

  const signatureRequestApi = new SignatureRequestApi();
  signatureRequestApi.username = dropboxSignApiKey;

  try {
    const contractRef = db.collection("contracts").doc(contractId);
    const contractDoc = await contractRef.get();

    if (!contractDoc.exists) {
      throw new HttpsError("not-found", "Contract not found.");
    }
    const contractData = contractDoc.data();
    if (!contractData || !contractData.signatureRequestId) {
      throw new HttpsError("failed-precondition", "Contract has not been sent for signature yet.");
    }

    const apiResponse = await signatureRequestApi.signatureRequestGet(contractData.signatureRequestId);
    const updatedSignatureRequest = apiResponse.body.signatureRequest;

    if (!updatedSignatureRequest) {
      throw new Error("Could not retrieve signature request details from Dropbox Sign.");
    }

    const currentParties = contractData.parties || [];
    const updatedParties = currentParties.map((party: any) => {
      const correspondingSignature = updatedSignatureRequest.signatures?.find(
        (sig) => sig.signerEmailAddress === party.email
      );
      if (correspondingSignature?.statusCode === "signed") {
        return { ...party, status: "signed" };
      }
      return party;
    });

    const isComplete = updatedSignatureRequest.isComplete || false;
    
    const dataToUpdate: any = {
      parties: updatedParties,
      lastUpdatedAt: FieldValue.serverTimestamp(),
    };

    if (isComplete) {
      dataToUpdate.status = "completed";
    }

    await contractRef.update(dataToUpdate);
    logger.info(`Successfully refreshed status for contract ${contractId}. Completed: ${isComplete}`);

    const finalDoc = await contractRef.get();
    return { id: finalDoc.id, ...finalDoc.data() };

  } catch (error: any) {
    logger.error("Error refreshing contract status:", {
      contractId,
      error: error.response ? error.response.body : error.message,
    });
    throw new HttpsError(
      "internal",
      "An unexpected error occurred while refreshing the contract status.",
      error.message
    );
  }
});
