
import { StoredContractDataSchema, RequestDataSchema } from "./types/schemas";
import { getEmbeddedSignUrl } from "./services/dropbox-sign";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";

const db = getFirestore();

/**
 * Creates a signable document from contract data and prepares it for embedded signing
 * using Dropbox Sign. This function handles HTML generation and API interaction.
 */
export const prepareContractForSigning = onCall(
  { memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {
    // 1. Validate input data and authentication
    const { contractId } = RequestDataSchema.parse(request.data);
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to prepare a contract for signing."
      );
    }
    const uid = request.auth.uid;
    const contractRef = db.collection("contracts").doc(contractId);

    try {
      // 2. Fetch contract from Firestore and validate ownership
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Contract not found.");
      }
      const contractData = StoredContractDataSchema.parse({
        id: contractDoc.id,
        ...contractDoc.data(),
      });

      if (contractData.ownerId !== uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not authorized to modify this contract."
        );
      }

      // 3. Generate a robust HTML document for signing
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${contractData.title}</title>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; direction: rtl; text-align: right; }
    h1 { font-size: 24px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    p { line-height: 1.6; }
    .sig-container { 
      border: 1px solid #ccc; 
      padding: 15px; 
      margin-top: 20px;
      margin-bottom: 20px;
      width: 250px; 
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <h1>${contractData.title}</h1>
  <p><strong>נערך ונחתם בתאריך:</strong> ${new Date().toLocaleDateString("he-IL")}</p>
  <p><strong>פרטי החוזה:</strong> ${JSON.stringify(contractData.formData, null, 2)}</p>
  <br/><br/><br/><br/>
  <p><strong>חתימת צד א':</strong></p>
  <div class="sig-container">
    [sig|req|signer1|חתימה]
  </div>
  <p><strong>חתימת צד ב':</strong></p>
   <div class="sig-container">
    [sig|req|signer2|חתימה]
  </div>
</body>
</html>`;

      functions.logger.info(`Generated HTML for contract ${contractId}`);

      // 4. Update contract status to prevent concurrent modifications
      await contractRef.update({ status: "generating-pdf" });

      // 5. Call Dropbox Sign to create the embedded signing request
      const htmlBuffer = Buffer.from(htmlContent, "utf-8");
      const signers = (contractData.parties || []).map((party) => ({
        emailAddress: party.email,
        name: party.name,
      }));

      // Ensure there are signers before proceeding
      if (signers.length === 0) {
        throw new functions.https.HttpsError("failed-precondition", "The contract must have at least one party to sign.");
      }

      const signResult = await getEmbeddedSignUrl(htmlBuffer, signers, contractData.title);

      // 6. Update contract in Firestore with signing metadata
      await contractRef.update({
        status: "out-for-signature",
        lastUpdatedAt: FieldValue.serverTimestamp(),
        signatureRequestId: signResult.signatureRequestId,
        signUrl: signResult.signUrl,
      });

      functions.logger.info(`Contract ${contractId} is now out for signature.`);
      return { success: true, ...signResult };
    } catch (error: any) {
      functions.logger.error(`Error preparing contract ${contractId} for signing:`, error);
      await contractRef.update({ status: "error" });
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while preparing the contract."
      );
    }
  }
);
