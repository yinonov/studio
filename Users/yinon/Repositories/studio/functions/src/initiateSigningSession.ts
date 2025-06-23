
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  SignatureRequestApi,
  EmbeddedApi,
  SubSignatureRequestSigner,
  SubSigningOptions,
} from "@dropbox/sign";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export const initiateSigningSession = onCall(
  { region: "us-central1" },
  async (request) => {
    logger.info("initiateSigningSession called with data: ", request.data);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
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

    const signatureRequestApi = new SignatureRequestApi();
    signatureRequestApi.username = dropboxSignApiKey;

    const embeddedApi = new EmbeddedApi();
    embeddedApi.username = dropboxSignApiKey;

    try {
      const contractRef = db.collection("contracts").doc(contractId);
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new HttpsError("not-found", "Contract not found.");
      }
      const contractData = contractDoc.data();
      if (!contractData) {
        throw new HttpsError("internal", "Contract data is empty.");
      }

      if (!contractData.parties || contractData.parties.length === 0) {
        throw new HttpsError("failed-precondition", "Contract has no parties/signers defined.");
      }
      const signers: SubSignatureRequestSigner[] = contractData.parties.map(
        (party: any, index: number) => ({
          name: party.name,
          emailAddress: party.email,
          order: index,
        })
      );

      const isDevelopment = process.env.FUNCTIONS_EMULATOR === "true";

      const signatureRequestData = {
        clientId: dropboxSignClientId,
        title: contractData.title || "Contract for Signature",
        subject: `Signature Request: ${contractData.title || "Contract"}`,
        message: "Please review and sign the document.",
        signers,
        fileUrls: ["https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"],
        testMode: isDevelopment,
        signingOptions: {
          draw: true,
          type: true,
          upload: true,
          phone: false,
          defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
        },
        skipDomainVerification: isDevelopment,
      };

      const response = await signatureRequestApi.signatureRequestCreateEmbedded(signatureRequestData);
      const signatureRequest = response.body.signatureRequest;

      if (!signatureRequest || !signatureRequest.signatures || !signatureRequest.signatureRequestId) {
        throw new Error("Invalid response from Dropbox Sign: Missing signature request details.");
      }
      logger.info("Successfully created embedded signature request.", {
        signatureRequestId: signatureRequest.signatureRequestId,
      });

      const firstSignatureId = signatureRequest.signatures[0]?.signatureId;
      if (!firstSignatureId) {
        throw new Error("Could not get signature ID for the first signer.");
      }

      const embeddedResponse = await embeddedApi.embeddedSignUrl(firstSignatureId);
      const signingUrl = embeddedResponse.body.embedded?.signUrl;

      if (!signingUrl) {
        throw new Error("Failed to get embedded signing URL.");
      }

      const partiesWithStatus = contractData.parties.map((party: any) => {
        const signature = signatureRequest.signatures?.find(
          (sig) => sig.signerEmailAddress === party.email
        );
        return {
          ...party,
          status: "pending",
          signatureId: signature?.signatureId || null,
        };
      });

      await contractRef.update({
        status: "pending",
        lastUpdatedAt: FieldValue.serverTimestamp(),
        signatureRequestId: signatureRequest.signatureRequestId,
        parties: partiesWithStatus,
      });
      logger.info("Updated contract in Firestore with pending status and signature details.", { contractId });

      return { signingUrl, clientId: dropboxSignClientId };
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
