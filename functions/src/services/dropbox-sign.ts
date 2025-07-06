import { defineString } from "firebase-functions/params";
import * as functions from "firebase-functions";
import {
  SignatureRequestApi,
  SignatureRequestCreateEmbeddedRequest,
  SubSignatureRequest,
  EmbeddedApi,
} from "@dropbox/sign";
import { StoredContractData, Party } from "../types/schemas";
import { Firestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

// Define Firebase params for security
const dropboxSignApiKeyParam = defineString("DROPBOX_SIGN_API_KEY");
const dropboxSignClientIdParam = defineString("DROPBOX_SIGN_CLIENT_ID");

/**
 * Prepares a contract for signing by creating a Dropbox Sign signature request.
 * This version uses a DUMMY HTML content for testing the flow.
 * @param {string} contractId - The ID of the contract document in Firestore.
 * @param {Firestore} db - The Firestore database instance.
 * @return {Promise<{success: boolean}>}
 */
export const prepareContractForSigning = async (
  contractId: string,
  db: Firestore
) => {
  if (!contractId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a 'contractId'."
    );
  }

  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const dropboxSignClientId = dropboxSignClientIdParam.value();

  const contractRef = db.collection("contracts").doc(contractId);
  const contractDoc = await contractRef.get();
  if (!contractDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      `Contract with ID ${contractId} not found.`
    );
  }
  const contract = contractDoc.data() as StoredContractData;

  const signers =
    contract.parties?.map((party, index) => ({
      emailAddress: party.email,
      name: party.name,
      order: index,
      role: `signer${index + 1}`,
    })) || [];

  // Generate signature boxes dynamically based on the number of signers
  const signatureBoxes = signers.map((signer) => 
    `<div style="margin-top: 40px; border: 1px solid #eee; padding: 20px; background: #f9f9f9;">[sig|req|${signer.role}|Please sign here, ${signer.name}]</div>`
  ).join("\n");
  
  // DUMMY HTML CONTENT
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>דוגמה: ${contract.title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 40px; text-align: right; direction: rtl; line-height: 1.6;}
        h1 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>דוגמת חוזה: ${contract.title}</h1>
      <p>זוהי דוגמה של חוזה לבדיקת תהליך החתימה בלבד. התוכן המוצג כאן אינו התוכן הסופי של החוזה.</p>
      <p>אנא חתמו במקומות המיועדים להלן.</p>
      ${signatureBoxes}
    </body>
    </html>
  `;

  const signatureRequestData: SignatureRequestCreateEmbeddedRequest = {
    clientId: dropboxSignClientId,
    title: contract.title,
    subject: `חתימה על חוזה: ${contract.title}`,
    message: "נא לעבור על החוזה ולחתום במקומות המיועדים.",
    signers: signers,
    files: [
      {
        name: `${contractId}.html`,
        data: Buffer.from(htmlContent, "utf8"),
      },
    ],
    useTextTags: true,
    testMode: true,
  };

  const api = new SignatureRequestApi();
  api.username = dropboxSignApiKey;

  try {
    const response = await api.signatureRequestCreateEmbedded(
      signatureRequestData
    );
    const signatureRequest: SubSignatureRequest = response.body.signatureRequest!;
    
    // Update the Firestore document with the request ID and individual signature IDs
    const updatedParties = contract.parties?.map((party: Party) => {
      const correspondingSignature = signatureRequest.signatures?.find(
        (sig) => sig.signerEmailAddress === party.email
      );
      return {
        ...party,
        signatureId: correspondingSignature?.signatureId || null,
        status: "pending",
      };
    }) || [];

    await contractRef.update({
      status: "out-for-signature",
      signatureRequestId: signatureRequest.signatureRequestId,
      parties: updatedParties,
      lastUpdatedAt: new Date(),
    });

    return { success: true, signatureRequestId: signatureRequest.signatureRequestId };
  } catch (error: any) {
    functions.logger.error("Error creating Dropbox Sign request:", error.body || error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create signature request."
    );
  }
};


/**
 * Gets a fresh, one-time-use embedded signing URL for a specific signer.
 * @param {string} signatureId - The signature ID from Dropbox Sign.
 * @return {Promise<{signUrl: string}>} - The embedded sign URL.
 */
export const getEmbeddedSignUrlForSigner = async (signatureId: string) => {
  if (!signatureId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing signatureId.");
  }
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const api = new EmbeddedApi();
  api.username = dropboxSignApiKey;

  try {
    const response = await api.embeddedSignUrl(signatureId);
    return { signUrl: response.body.embedded!.signUrl };
  } catch (error: any) {
    functions.logger.error("Error getting embedded sign URL:", error.body || error);
    throw new functions.https.HttpsError("internal", "Failed to retrieve sign URL.");
  }
};


/**
 * Handles webhook callbacks from Dropbox Sign.
 * @param {functions.Request} req - The Express request object.
 * @param {functions.Response} res - The Express response object.
 * @param {Firestore} db - The Firestore instance.
 */
export const handleDropboxSignCallback = async (req: functions.Request, res: functions.Response, db: Firestore) => {
    // Respond to Dropbox Sign immediately to acknowledge receipt
    res.status(200).send("Hello API Event Received");

    // The 'json_data' field is sent as a string, so we need to parse it
    if (!req.body.json_data) {
        functions.logger.warn("Callback received without json_data.");
        return;
    }
    
    const event = JSON.parse(req.body.json_data).event;
    functions.logger.info("Received Dropbox Sign event:", { type: event.event_type, metadata: event.event_metadata });

    // Verify the event came from Dropbox Sign
    const apiKey = dropboxSignApiKeyParam.value();
    const hash = crypto.createHmac("sha256", apiKey).update(event.event_time + event.event_type).digest("hex");
    if (hash !== event.event_hash) {
        functions.logger.error("Invalid Dropbox Sign event hash.", { received: event.event_hash, expected: hash });
        return; // Security risk, do not process
    }

    const { signature_request, signature } = event.event_metadata;
    const signatureRequestId = signature_request.signature_request_id;
    
    const contractsRef = db.collection("contracts");
    const q = contractsRef.where("signatureRequestId", "==", signatureRequestId);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        functions.logger.warn("Received callback for unknown signature request ID:", signatureRequestId);
        return;
    }
    const contractDoc = querySnapshot.docs[0];
    const contract = contractDoc.data() as StoredContractData;

    if (event.event_type === "signature_request_signed") {
        const signatureId = signature.signature_id;
        const updatedParties = contract.parties!.map(p => 
            p.signatureId === signatureId ? { ...p, status: "signed" as "signed" } : p
        );

        await contractDoc.ref.update({
            parties: updatedParties,
            status: "partially-signed",
            lastUpdatedAt: new Date(),
        });
        functions.logger.info(`Updated party status to 'signed' for contract ${contractDoc.id}`);

    } else if (event.event_type === "signature_request_all_signed") {
        await contractDoc.ref.update({
            status: "completed",
            lastUpdatedAt: new Date(),
        });
        functions.logger.info(`Contract ${contractDoc.id} has been fully signed and completed.`);

    } else {
        functions.logger.info(`Unhandled event type: ${event.event_type}`);
    }
};
