import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  SignatureRequestApi,
  SubSignatureRequestSigner,
  SubSigningOptions,
  type SignatureRequestCreateEmbeddedRequest,
} from "@dropbox/sign";
import { RequestDataSchema } from "../../src/types/schemas";
import type { Party } from "../../src/types";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

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

    const validation = RequestDataSchema.safeParse(request.data);
    if (!validation.success) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid data provided.",
        validation.error.issues
      );
    }
    const { contractId } = validation.data;

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
        throw new HttpsError(
          "failed-precondition",
          "Contract has no parties/signers defined."
        );
      }
      const signers: SubSignatureRequestSigner[] = contractData.parties.map(
        (party: Party, index: number) => ({
          name: party.name,
          emailAddress: party.email,
          order: index,
        })
      );

      const isDevelopment = process.env.FUNCTIONS_EMULATOR === "true";

      const signingOptions: SubSigningOptions = {
        draw: true,
        type: true,
        upload: true,
        phone: false,
        defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
      };

      const signatureRequestData: SignatureRequestCreateEmbeddedRequest = {
        clientId: dropboxSignClientId,
        title: contractData.title || "Contract for Signature",
        subject: `Signature Request: ${contractData.title || "Contract"}`,
        message: "Please review and sign the document.",
        signers,
        fileUrls: [
          "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        ],
        testMode: isDevelopment,
        signingOptions: signingOptions,
      };
      logger.info("Prepared signature request data for Dropbox Sign API.", {
        isDevelopment,
      });

      const response = await signatureRequestApi.signatureRequestCreateEmbedded(
        signatureRequestData
      );
      const signatureRequest = response.body.signatureRequest;

      if (
        !signatureRequest ||
        !signatureRequest.signatures ||
        !signatureRequest.signatureRequestId
      ) {
        throw new Error(
          "Invalid response from Dropbox Sign: Missing signature request details."
        );
      }
      logger.info("Successfully created embedded signature request.", {
        signatureRequestId: signatureRequest.signatureRequestId,
      });

      const signatureIdMap = new Map<string, string>();
      signatureRequest.signatures.forEach((sig) => {
        if (sig.signerEmailAddress && sig.signatureId) {
          signatureIdMap.set(
            sig.signerEmailAddress.toLowerCase(),
            sig.signatureId
          );
        }
      });

      const partiesWithDetails = contractData.parties.map((party: Party) => ({
        ...party,
        status: "pending",
        signatureId: signatureIdMap.get(party.email.toLowerCase()) || null,
      }));

      await contractRef.update({
        status: "pending",
        lastUpdatedAt: FieldValue.serverTimestamp(),
        signatureRequestId: signatureRequest.signatureRequestId,
        parties: partiesWithDetails,
      });
      logger.info(
        "Updated contract in Firestore with pending status and signature details.",
        { contractId }
      );

      return { success: true };
    } catch (error: unknown) {
      const e = error as { response?: { body: unknown }; message?: string };
      logger.error("Error during Dropbox Sign process:", {
        contractId,
        error: e.response ? e.response.body : e.message,
      });
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while initiating the signing session.",
        e.message
      );
    }
  }
);
