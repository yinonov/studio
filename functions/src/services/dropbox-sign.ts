
import * as functions from "firebase-functions";
import {
  SignatureRequestApi,
  EmbeddedApi,
  SubSigningOptions,
  SubSignatureRequestSigner,
  SignatureRequestCreateEmbeddedRequest,
} from "@dropbox/sign";
import { getStorage } from "firebase-admin/storage";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { defineString } from "firebase-functions/params";

// Define Firebase params for security
const dropboxSignApiKeyParam = defineString("DROPBOX_SIGN_API_KEY");
const dropboxSignClientIdParam = defineString("DROPBOX_SIGN_CLIENT_ID");

// Define the expected structure for a signer
export interface Signer {
  emailAddress: string;
  name: string;
}

/**
 * Creates an embedded signature request using Dropbox Sign.
 *
 * @param htmlBuffer The HTML content of the contract as a Buffer.
 * @param signers An array of signers for the document.
 * @param title The title of the document.
 * @returns An object with the sign URL and the signature request ID.
 */
export const getEmbeddedSignUrl = async (
  htmlBuffer: Buffer,
  signers: Signer[],
  title: string
): Promise<{ signUrl: string; signatureRequestId: string }> => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const dropboxSignClientId = dropboxSignClientIdParam.value();

  if (!dropboxSignApiKey || !dropboxSignClientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Dropbox Sign API key or Client ID is not configured in environment."
    );
  }

  const signatureRequestApi = new SignatureRequestApi();
  signatureRequestApi.username = dropboxSignApiKey;

  // Map the signers to the format required by the Dropbox Sign API
  const subSignatureRequestSigners: SubSignatureRequestSigner[] = signers.map(
    (signer, index) => ({
      role: `signer${index + 1}`, // Crucially matches text tags like [sig|req|signer1|...]
      emailAddress: signer.emailAddress,
      name: signer.name,
      order: index,
    })
  );

  // Write the HTML buffer to a temporary file to be uploaded
  const tempFilePath = path.join(os.tmpdir(), `contract-${Date.now()}.html`);
  fs.writeFileSync(tempFilePath, htmlBuffer);
  const fileReadStream = fs.createReadStream(tempFilePath);
  
  const data: SignatureRequestCreateEmbeddedRequest = {
    clientId: dropboxSignClientId,
    files: [fileReadStream],
    title: title || "Contract for Signing",
    subject: `Your contract "${title}" is ready for signature`,
    message: "Please review and sign the attached document to finalize our agreement.",
    signers: subSignatureRequestSigners,
    signingOptions: {
      draw: true,
      type: true,
      upload: false,
      phone: false,
      defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
    },
    useTextTags: true,
    hideTextTags: true,
    testMode: true,
  };

  try {
    const result = await signatureRequestApi.signatureRequestCreateEmbedded(data);
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    const signatureRequest = result.body.signatureRequest;
    if (!signatureRequest?.signatureRequestId) {
        throw new Error("Signature Request ID missing from Dropbox Sign response.");
    }
    if (!signatureRequest.signatures?.length) {
        throw new Error("No signatures found in the Dropbox Sign response.");
    }
    
    const signatureId = signatureRequest.signatures[0].signatureId;
    if (!signatureId) {
        throw new Error("Signature ID for the first signer is missing.");
    }

    // Use the signatureId to get the embedded signing URL
    const embeddedApi = new EmbeddedApi();
    embeddedApi.username = dropboxSignApiKey;
    const embeddedResult = await embeddedApi.embeddedSignUrl(signatureId);
    
    const signUrl = embeddedResult.body.embedded?.signUrl;
    if (!signUrl) {
      throw new Error("Embedded Sign URL is missing from Dropbox Sign response.");
    }

    return {
      signUrl: signUrl,
      signatureRequestId: signatureRequest.signatureRequestId,
    };
  } catch (error: any) {
    functions.logger.error("Error creating embedded signature request:", error.response?.body || error.message);
    // Clean up temp file on error as well
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create embedded signature request with Dropbox Sign.",
      error
    );
  }
};

/**
 * Downloads the signed PDF and audit trail from Dropbox Sign and saves them to Cloud Storage.
 *
 * @param signatureRequestId The ID of the completed signature request.
 * @param contractId The ID of the contract document in Firestore.
 * @returns An object containing the public URLs of the saved files.
 */
export const downloadSignedFiles = async (
  signatureRequestId: string,
  contractId: string
): Promise<{ signedPdfUrl: string; auditTrailUrl: string }> => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const signatureRequestApi = new SignatureRequestApi();
  signatureRequestApi.username = dropboxSignApiKey;
  const bucket = getStorage().bucket();

  // Helper function to download a file and upload it to GCS
  const downloadAndUpload = async (fileType: "pdf" | "zip"): Promise<string> => {
    const result = await signatureRequestApi.signatureRequestFiles(
      signatureRequestId,
      fileType
    );

    const destination = `contracts/${contractId}/signed_documents/${Date.now()}_${fileType === "pdf" ? "signed_contract.pdf" : "audit_trail.zip"}`;
    const file = bucket.file(destination);

    await file.save(result.body, {
      metadata: { contentType: fileType === "pdf" ? "application/pdf" : "application/zip" },
    });
    
    // Return a long-lived signed URL for the file
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491", 
    });
    return url;
  };

  try {
    const signedPdfUrl = await downloadAndUpload("pdf");
    const auditTrailUrl = await downloadAndUpload("zip");
    return { signedPdfUrl, auditTrailUrl };
  } catch (error) {
    functions.logger.error(`Error downloading signed files for request ${signatureRequestId}:`, error);
    throw new functions.https.HttpsError("internal", "Failed to download signed files from Dropbox Sign.");
  }
};
