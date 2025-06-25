import { StoredContractDataSchema, RequestDataSchema, DropboxSignEventSchema } from "../../src/types/schemas";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { getEmbeddedSignUrl } from "./services/dropbox-sign";
import * as crypto from "crypto";

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
    const contractData = StoredContractDataSchema.parse(contractDoc.data());

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
    const { signUrl, signatureRequestId } = await getEmbeddedSignUrl(contractData.pdfUrl, [signer]);

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
    throw new functions.https.HttpsError("internal", "An unexpected error occurred while preparing the document for signing.");
  }
});

export const dropboxSignCallback = onRequest(async (req, res) => {
  const dropboxApiKey = functions.config().dropbox.apikey;
  if (req.method === "POST") {
    const event = DropboxSignEventSchema.parse(req.body);

    // Verify the event hash to ensure it's from Dropbox Sign
    const hash = crypto.createHmac("sha256", dropboxApiKey)
      .update(event.event.event_time + event.event.event_type)
      .digest("hex");

    if (hash !== event.event.event_hash) {
      res.status(401).send("Event hash mismatch.");
      return;
    }

    res.status(200).send("Hello API Event Received");

    const signatureRequestId = event.signature_request.signature_request_id;
    const contractRef = db.collection("contracts").where("signatureRequestId", "==", signatureRequestId);

    try {
      const snapshot = await contractRef.get();
      if (snapshot.empty) {
        functions.logger.error(`No contract found for signature request ID: ${signatureRequestId}`);
        return;
      }

      const contractDoc = snapshot.docs[0];
      const contractId = contractDoc.id;

      switch (event.event.event_type) {
      case "signature_request_all_signed":
        await db.collection("contracts").doc(contractId).update({
          status: "completed",
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // TODO: Download the signed PDF and audit trail
        break;
        // Add other event handlers as needed
      }
    } catch (error) {
      functions.logger.error("Error processing Dropbox Sign event:", error);
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
});
