import * as functions from "firebase-functions";
import {
  SignatureRequestApi,
  EmbeddedApi,
  SubSigningOptions,
  SubSignatureRequestSigner,
  SignatureRequestCreateEmbeddedRequest,
} from "@dropbox/sign";

// Define the expected structure for a signer
export interface Signer {
  emailAddress: string;
  name: string;
}

/**
 * Creates an embedded signature request with Dropbox Sign.
 *
 * @param fileUrl The publicly accessible URL of the PDF to be signed.
 * @param signers An array of signers for the document.
 * @returns An object with the sign URL and signature request ID.
 */
export const getEmbeddedSignUrl = async (
  fileUrl: string,
  signers: Signer[],
): Promise<{ signUrl: string; signatureRequestId: string }> => {
  const dropboxApiKey = functions.config().dropbox.apikey;
  const dropboxClientId = functions.config().dropbox.clientid;

  if (!dropboxApiKey || !dropboxClientId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Dropbox Sign API key or Client ID is not configured.",
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
    }),
  );

  const data: SignatureRequestCreateEmbeddedRequest = {
    clientId: dropboxClientId,
    fileUrls: [fileUrl],
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
    testMode: true, // Use test mode for development
  };

  try {
    const result = await signatureRequestApi.signatureRequestCreateEmbedded(data);
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
      "Failed to create embedded signature request.",
    );
  }
};
