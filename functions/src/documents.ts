import { StoredContractDataSchema, RequestDataSchema } from "./types/schemas";
import { getEmbeddedSignUrl } from "./services/dropbox-sign";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";

const db = getFirestore();

export const generatePdfForSigning = onCall(
  { memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {
    // 1. Validate input data
    const { contractId } = RequestDataSchema.parse(request.data);

    // 2. Check for authenticated user
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to generate a PDF."
      );
    }
    const uid = request.auth.uid;

    const contractRef = db.collection("contracts").doc(contractId);

    try {
      // 3. Get contract from Firestore
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Contract not found."
        );
      }
      const contractData = StoredContractDataSchema.parse({
        id: contractDoc.id,
        ...contractDoc.data(),
      });

      // 4. Check if user is the owner
      if (contractData.ownerId !== uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "You are not authorized to generate a PDF for this contract."
        );
      }

      // 5. Generate HTML from contractData.formData and a template (placeholder for now)
      const htmlContent =
        "<html><body><h1>" +
        contractData.title +
        "</h1>" +
        "<p>This is a test contract generated for user " +
        uid +
        ".</p>" +
        "<br><br><br><br>" +
        "[sig|req|signer1|Signature]" +
        "<br><br>" +
        "[date|req|signer1|Date Signed]" +
        "</body></html>";

      // 6. Update contract status to 'generating-pdf'
      await contractRef.update({ status: "generating-pdf" });

      // 7. Convert HTML string to a Buffer
      functions.logger.info("Converting HTML to buffer for contract", contractId);
      const htmlBuffer = Buffer.from(htmlContent, "utf-8");

      // 8. Pass htmlBuffer to Dropbox Sign API
      // Prepare signers array from contractData.parties
      const signers = (contractData.parties || []).map((party) => ({
        emailAddress: party.email,
        name: party.name,
      }));

      // Let Dropbox Sign convert the HTML to a signable PDF
      const signResult = await getEmbeddedSignUrl(htmlBuffer, signers);

      // 9. Update contract status and store Dropbox Sign URLs/metadata
      await contractRef.update({
        status: "out-for-signature",
        lastUpdatedAt: FieldValue.serverTimestamp(),
        ...signResult, // Spread Dropbox Sign metadata into Firestore
      });
      functions.logger.info(
        "Contract updated with status 'out-for-signature' and Dropbox Sign metadata",
        contractId
      );
      return { success: true, ...signResult };
    } catch (error) {
      functions.logger.error(
        `Error generating PDF for contract ${contractId}:`,
        error
      );
      // Update contract status to 'error'
      await contractRef.update({ status: "error" });
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while generating the PDF."
      );
    }
  }
);
