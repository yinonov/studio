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

export const dropboxSignCallback = onRequest(async (req, res) => {
  const dropboxApiKey = dropboxSignApiKeyParam.value();
  if (!dropboxApiKey) {
    functions.logger.error("Dropbox Sign API key is not configured.");
    res.status(500).send("Configuration error.");
    return;
  }

  // Dropbox Sign requires a "200 OK" response with a specific body format
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send("Hello API Event Received");

  if (req.method === "POST") {
    // Use Dropbox Sign SDK type for event
    const event = req.body as EventCallbackRequest;

    // Verify the event hash to ensure it's from Dropbox Sign
    // Update property access to match EventCallbackRequest (camelCase)
    const hash = crypto.createHmac("sha256", dropboxApiKey)
      .update(event.event.eventTime + event.event.eventType)
      .digest("hex");

    if (hash !== event.event.eventHash) {
      functions.logger.warn("Event hash mismatch, ignoring callback.");
      return; // Return after sending the 200 response
    }

    if (!event.signatureRequest || !event.signatureRequest.signatureRequestId) {
      functions.logger.error("signatureRequest or signatureRequestId missing in Dropbox Sign event");
      return; // Return after sending the 200 response
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
    functions.logger.warn(`Received a ${req.method} request, but only POST is handled.`);
  }
});
