import { StoredContractDataSchema, RequestDataSchema } from "./types/schemas";
import { createPdfBuffer } from "./services/docraptor";
import { getEmbeddedSignUrl } from "./services/dropbox-sign";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { generateThumbnail } from "./services/pdf";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import axios from "axios";

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

      // 7. Create PDF buffer (synchronous, best practice)
      functions.logger.info("Calling createPdfBuffer for contract", contractId);
      const pdfBuffer = await createPdfBuffer(htmlContent, true);
      functions.logger.info(
        "Received PDF buffer from createPdfBuffer",
        contractId
      );

      // 8. Pass pdfBuffer to Dropbox Sign API
      // Prepare signers array from contractData.parties
      const signers = (contractData.parties || []).map((party) => ({
        emailAddress: party.email,
        name: party.name,
      }));
      const signResult = await getEmbeddedSignUrl(pdfBuffer, signers);

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

/**
 * Generates a watermarked "DRAFT" thumbnail for a contract.
 * Triggered when a contract's status becomes 'out-for-signature' and a PDF URL is available.
 */
export const generateDraftThumbnail = onDocumentUpdated(
  "contracts/{contractId}",
  async (event) => {
    if (!event.data) {
      return;
    }
    const contractDataAfter = event.data.after.data();
    const contractDataBefore = event.data.before.data();

    if (!contractDataAfter) {
      functions.logger.log("No data after update, exiting.");
      return;
    }

    // Check if the PDF is ready and thumbnail hasn't been generated
    const isReadyForThumbnail =
      contractDataAfter.status === "out-for-signature" &&
      contractDataAfter.pdfUrl &&
      !contractDataAfter.thumbnailUrl &&
      contractDataBefore.status !== "out-for-signature";

    if (isReadyForThumbnail) {
      const { contractId } = event.params;
      const pdfUrl = contractDataAfter.pdfUrl;

      functions.logger.log(`Generating thumbnail for contract ${contractId}`);

      try {
        // 1. Download the PDF to a temporary file
        const tempFileName = `${contractId}.pdf`;
        const tempFilePath = path.join(os.tmpdir(), tempFileName);
        const response = await axios.get(pdfUrl, { responseType: "stream" });
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        // 2. Generate thumbnail using the pdf service
        const bucket = admin.storage().bucket();
        const thumbnailStoragePath = `contracts-thumbs/${contractId}.png`;
        await generateThumbnail(tempFilePath, bucket, thumbnailStoragePath);

        // 3. Get a signed URL for the thumbnail
        const signedUrl = await bucket.file(thumbnailStoragePath).getSignedUrl({
          action: "read",
          expires: "03-09-2491", // A very long time
        });

        // 4. Update Firestore with the thumbnail URL
        await db.collection("contracts").doc(contractId).update({
          thumbnailUrl: signedUrl[0],
        });

        functions.logger.log(
          `Successfully generated thumbnail for contract ${contractId}`
        );

        // 5. Clean up temporary file
        fs.unlinkSync(tempFilePath);
      } catch (error) {
        functions.logger.error(
          `Error generating thumbnail for contract ${contractId}:`,
          error
        );
        await db.collection("contracts").doc(contractId).update({
          status: "error",
          statusMessage: "Failed to generate thumbnail.",
        });
      }
    }
  }
);
