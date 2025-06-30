import { StoredContractDataSchema, RequestDataSchema } from "./types/schemas";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { getEmbeddedSignUrl, downloadSignedFiles } from "./services/dropbox-sign";
import * as crypto from "crypto";
import axios from "axios";
import type { EventCallbackRequest } from "@dropbox/sign";

const db = getFirestore();

/**
 * Initiates an embedded signing session with Dropbox Sign.
 * This function is called by the client to get a URL for the embedded signing view.
 */
export const initiateDropboxSignSession = onCall(async (request) => {
  // 1. Validate input data
  const { contractId } = RequestDataSchema.parse(request.data);

  // 2. Check for authenticated user
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const uid = request.auth.uid;

  const contractRef = db.collection("contracts").doc(contractId);

  try {
    // 3. Get contract from Firestore
    const contractDoc = await contractRef.get();
    if (!contractDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Contract not found.");
    }
    const contractData = StoredContractDataSchema.parse({
      id: contractDoc.id,
      ...contractDoc.data(),
    });

    // 4. Check if user is the owner
    if (contractData.ownerId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "You are not authorized to sign this contract.");
    }

    // 5. Check contract status
    if (contractData.status !== "out-for-signature" || !contractData.pdfUrl) {
      throw new functions.https.HttpsError("failed-precondition", "Contract is not ready for signature.");
    }

    // 6. Get signer information
    const signer = {
      emailAddress: request.auth.token.email || "",
      name: request.auth.token.name || "Contract Owner",
    };

    if (!signer.emailAddress) {
      throw new functions.https.HttpsError("failed-precondition", "User email is not available.");
    }

    // 7. Call Dropbox Sign service to get an embedded signing URL
    // Download the PDF from pdfUrl and pass as buffer
    const pdfResponse = await axios.get(contractData.pdfUrl, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(pdfResponse.data);
    const { signUrl, signatureRequestId } = await getEmbeddedSignUrl(pdfBuffer, [signer]);

    // 8. Update contract with signature request ID
    await contractRef.update({
      signatureRequestId: signatureRequestId,
      status: "signing-in-progress",
    });

    return { success: true, signUrl: signUrl };
  } catch (error) {
    functions.logger.error(`Error initiating Dropbox Sign for contract ${contractId}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred while preparing the document for signing."
    );
  }
});

export const dropboxSignCallback = onRequest(async (req, res) => {
  const dropboxApiKey = functions.config().dropbox.apikey;
  if (req.method === "POST") {
    // Use Dropbox Sign SDK type for event
    const event = req.body as EventCallbackRequest;

    // Verify the event hash to ensure it's from Dropbox Sign
    // Update property access to match EventCallbackRequest (camelCase)
    const hash = crypto.createHmac("sha256", dropboxApiKey)
      .update(event.event.eventTime + event.event.eventType)
      .digest("hex");

    if (hash !== event.event.eventHash) {
      res.status(401).send("Event hash mismatch.");
      return;
    }

    res.status(200).send("Hello API Event Received");

    if (!event.signatureRequest || !event.signatureRequest.signatureRequestId) {
      functions.logger.error("signatureRequest or signatureRequestId missing in Dropbox Sign event");
      res.status(400).send("Missing signatureRequestId");
      return;
    }
    const signatureRequestId = event.signatureRequest.signatureRequestId;
    const contractRef = db.collection("contracts").where("signatureRequestId", "==", signatureRequestId);

    try {
      const snapshot = await contractRef.get();
      if (snapshot.empty) {
        functions.logger.error(`No contract found for signature request ID: ${signatureRequestId}`);
        return;
      }

      const contractDoc = snapshot.docs[0];
      const contractId = contractDoc.id;

      if (event.event.eventType === "signature_request_signed") {
        const { signedPdfUrl, auditTrailUrl } = await downloadSignedFiles(signatureRequestId, contractId);

        await contractDoc.ref.update({
          status: "completed",
          signedPdfUrl: signedPdfUrl,
          auditTrailUrl: auditTrailUrl,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.log(`Contract ${contractId} signed and files saved.`);
      }

      // TODO: Handle other event types like 'signature_request_viewed', etc.
    } catch (error) {
      functions.logger.error(`Error processing Dropbox Sign event for signature request ${signatureRequestId}:`, error);
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
});
