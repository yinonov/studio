import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();

import {
  createDropboxSignSignatureRequest,
  getDropboxSignSignatureRequest,
} from "./services/dropbox-sign";
import { StoredContractDataSchema } from "./types/schemas";

export const prepareContractForSigning = onCall(async (data, _context) => {
  // For v2 onCall, input data is in data.data
  const contractId = data?.data?.contractId;
  if (!contractId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing contractId."
    );
  }
  functions.logger.info("contractId", {
    contractId,
  });

  try {
    const dropboxSignSignatureRequestId =
      await createDropboxSignSignatureRequest();
    functions.logger.info(
      "Result from createDropboxSignSignatureRequest (raw)",
      { dropboxSignSignatureRequestId }
    );
    if (!dropboxSignSignatureRequestId) {
      throw new functions.https.HttpsError(
        "internal",
        "Dropbox Sign did not return a signatureRequestId."
      );
    }
    // Update contract in Firestore
    const db = admin.firestore();
    const updateData: Partial<StoredContractDataSchema> = {
      status: "out-for-signature",
      dropboxSignSignatureRequestId,
      lastUpdatedAt: FieldValue.serverTimestamp(),
    };
    await db
      .collection("contracts")
      .doc(contractId)
      .update(StoredContractDataSchema.partial().parse(updateData));
    functions.logger.info(
      "Contract updated with Dropbox Sign signatureRequestId",
      {
        contractId,
        dropboxSignSignatureRequestId,
      }
    );
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError(
      "internal",
      "Dropbox Sign dummy call failed."
    );
  }
});

export const getContractDropboxSignData = onCall(async (data, _context) => {
  try {
    const contractId = data?.data;
    if (!contractId || typeof contractId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing or invalid contractId"
      );
    }
    const db = admin.firestore();
    const contractSnap = await db.collection("contracts").doc(contractId).get();
    if (!contractSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Contract not found");
    }
    const contract = contractSnap.data();
    const dropboxSignSignatureRequestId =
      contract?.dropboxSignSignatureRequestId;
    if (!dropboxSignSignatureRequestId) {
      throw new functions.https.HttpsError(
        "not-found",
        "No Dropbox Sign signature request ID for this contract"
      );
    }
    const signatureRequestGetResponse = await getDropboxSignSignatureRequest(
      dropboxSignSignatureRequestId
    );
    return signatureRequestGetResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : error;
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch Dropbox Sign data",
      errorMsg
    );
  }
});
