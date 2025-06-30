import * as functions from "firebase-functions";
import {
  SignatureRequestApi,
  EmbeddedApi,
  SubSigningOptions,
  SubSignatureRequestSigner,
  SignatureRequestCreateEmbeddedRequest,
} from "@dropbox/sign";
import { getStorage } from "firebase-admin/storage";
import type { z } from "zod";
import { StoredContractDataSchema } from "../types/schemas";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Define the expected structure for a signer
export interface Signer {
  emailAddress: string;
  name: string;
}

export type StoredContractData = z.infer<typeof StoredContractDataSchema>;

/**
 * Creates an embedded signature request with Dropbox Sign.
 *
 * @param pdfBuffer The PDF file as a Buffer.
 * @param signers An array of signers for the document.
 * @returns An object with the sign URL and signature request ID.
 */
export const getEmbeddedSignUrl = async (
  pdfBuffer: Buffer,
  signers: Signer[]
): Promise<{ signUrl: string; signatureRequestId: string }> => {
  const dropboxApiKey = process.env.DROPBOX_SIGN_API_KEY;
  const dropboxClientId = process.env.DROPBOX_SIGN_CLIENT_ID;

  if (!dropboxApiKey || !dropboxClientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Dropbox Sign API key or Client ID is not configured."
    );
  }

  const signatureRequestApi = new SignatureRequestApi();
  signatureRequestApi.username = dropboxApiKey;

  const subSignatureRequestSigners: SubSignatureRequestSigner[] = signers.map(
    (signer, index) => ({
      role: `signer_${index + 1}`,
      emailAddress: signer.emailAddress,
      name: signer.name,
      order: index,
    })
  );

  // Write buffer to a temp file and use fs.createReadStream
  const tempFilePath = path.join(
    os.tmpdir(),
    `dropboxsign-upload-${Date.now()}.pdf`
  );
  fs.writeFileSync(tempFilePath, pdfBuffer);
  const pdfReadStream = fs.createReadStream(tempFilePath);
  const data: SignatureRequestCreateEmbeddedRequest = {
    clientId: dropboxClientId,
    files: [pdfReadStream],
    title: "Contract for Signing",
    subject: "Your contract is ready for signature",
    message: "Please sign the contract to finalize our agreement.",
    signers: subSignatureRequestSigners,
    signingOptions: {
      draw: true,
      type: true,
      upload: true,
      phone: false,
      defaultType: "draw" as SubSigningOptions.DefaultTypeEnum,
    },
    useTextTags: true,
    testMode: true, // Use test mode for development
  };

  try {
    const result = await signatureRequestApi.signatureRequestCreateEmbedded(
      data
    );
    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    const signatureRequest = result.body.signatureRequest;

    if (!signatureRequest?.signatures?.length) {
      throw new Error("No signatures found in the response.");
    }

    const signatureId = signatureRequest.signatures[0].signatureId;
    if (!signatureId) {
      throw new Error("Signature ID is missing.");
    }

    const embeddedApi = new EmbeddedApi();
    embeddedApi.username = dropboxApiKey;

    const embeddedResult = await embeddedApi.embeddedSignUrl(signatureId);
    const signUrl = embeddedResult.body.embedded?.signUrl;

    if (!signUrl) {
      throw new Error("Sign URL is missing.");
    }

    if (!signatureRequest.signatureRequestId) {
      throw new Error("Signature Request ID is missing.");
    }

    return {
      signUrl: signUrl,
      signatureRequestId: signatureRequest.signatureRequestId,
    };
  } catch (error) {
    functions.logger.error("Error creating embedded signature request:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Error creating embedded signature request",
      error
    );
  }
};

/**
 * Downloads the signed PDF and audit trail from Dropbox Sign.
 *
 * @param signatureRequestId The ID of the signature request.
 * @param contractId The ID of the contract.
 * @returns An object with the URLs of the signed PDF and the audit trail.
 */
export const downloadSignedFiles = async (
  signatureRequestId: string,
  contractId: string
): Promise<{ signedPdfUrl: string; auditTrailUrl: string }> => {
  const dropboxApiKey = functions.config().dropbox.apikey;
  const signatureRequestApi = new SignatureRequestApi();
  signatureRequestApi.username = dropboxApiKey;

  const bucket = getStorage().bucket();

  const downloadAndUpload = async (
    fileType: "pdf" | "zip"
  ): Promise<string> => {
    const result = await signatureRequestApi.signatureRequestFiles(
      signatureRequestId,
      fileType
    );

    const destination = `contracts/${contractId}/signed.${fileType}`;
    const file = bucket.file(destination);

    // The body is a Buffer, so we can save it directly
    await file.save(result.body, {
      metadata: {
        contentType: fileType === "pdf" ? "application/pdf" : "application/zip",
      },
    });

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-09-2491", // A long time in the future
    });
    return url;
  };

  try {
    const signedPdfUrl = await downloadAndUpload("pdf");
    const auditTrailUrl = await downloadAndUpload("zip"); // This is a zip with PDF and audit trail

    return { signedPdfUrl, auditTrailUrl };
  } catch (error) {
    functions.logger.error(
      `Error downloading files for signature request ${signatureRequestId}:`,
      error
    );
    throw new functions.https.HttpsError(
      "internal",
      "Failed to download signed files."
    );
  }
};
