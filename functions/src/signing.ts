
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { downloadSignedFiles } from "./services/dropbox-sign";
import * as crypto from "crypto";
import type { EventCallbackRequest } from "@dropbox/sign";
import { defineString } from "firebase-functions/params";

const db = getFirestore();
const dropboxSignApiKeyParam = defineString("DROPBOX_SIGN_API_KEY");

/**
 * Handles webhook callbacks from Dropbox Sign.
 */
export const dropboxSignCallback = onRequest(async (req, res) => {
  const dropboxApiKey = dropboxSignApiKeyParam.value();
  if (!dropboxApiKey) {
    functions.logger.error("Dropbox Sign API key is not configured.");
    res.status(500).send("Server configuration error.");
    return;
  }

  // Dropbox Sign requires an immediate "200 OK" response with a specific body.
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send("Hello API Event Received");

  try {
    // Only process POST requests which contain event data.
    if (req.method !== "POST") {
      functions.logger.warn(`Received non-POST request method: ${req.method}`);
      return;
    }
    
    const event = req.body as EventCallbackRequest;

    // Verify the event hash to ensure it's a legitimate request from Dropbox Sign.
    const hash = crypto.createHmac("sha256", dropboxApiKey)
      .update(event.event.eventTime + event.event.eventType)
      .digest("hex");
    
    if (hash !== event.event.eventHash) {
      functions.logger.warn("Invalid event hash. Ignoring callback.", { received: event.event.eventHash, expected: hash });
      return;
    }

    // Process only 'signature_request_signed' events for this MVP.
    if (event.event.eventType !== "signature_request_signed") {
      functions.logger.info(`Received non-signing event: ${event.event.eventType}`);
      return;
    }

    const signatureRequestId = event.signatureRequest?.signatureRequestId;
    if (!signatureRequestId) {
      functions.logger.error("Signature Request ID is missing from the event payload.");
      return;
    }
    
    // Find the corresponding contract in Firestore.
    const contractsRef = db.collection("contracts");
    const query = contractsRef.where("signatureRequestId", "==", signatureRequestId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      functions.logger.error(`No contract found for signature request ID: ${signatureRequestId}`);
      return;
    }

    // Download the signed files and update the contract document.
    const contractDoc = snapshot.docs[0];
    const contractId = contractDoc.id;
    
    const { signedPdfUrl, auditTrailUrl } = await downloadSignedFiles(signatureRequestId, contractId);

    await contractDoc.ref.update({
      status: "completed",
      signedPdfUrl,
      auditTrailUrl,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.log(`Contract ${contractId} successfully signed and files saved.`);

  } catch (error) {
    functions.logger.error("Error processing Dropbox Sign callback:", error);
    // The response has already been sent, so we just log the error.
  }
});
