
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  SignatureRequestApi,
  SubSignatureRequestSigner,
  SubSigningOptions,
  type SignatureRequestCreateEmbeddedRequest,
} from "@dropbox/sign";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
const storage = getStorage();

// Helper function to interpolate contract data into clauses
function interpolateWithDefaults(
  text: string,
  data: Record<string, string>
): string {
  if (typeof text !== "string") {
    return "";
  }
  return text.replace(/\{\{(.+?)\}\}/g, (_match, captured) => {
    const parts = captured.split("||");
    const fieldName = parts[0].trim();
    const defaultValue = parts.length > 1 ? parts[1].trim() : `[${fieldName}]`;
    const valueFromData = data[fieldName];

    if (
      valueFromData !== undefined &&
      valueFromData !== null &&
      valueFromData !== ""
    ) {
      return String(valueFromData);
    }
    return defaultValue;
  });
}

function generateContractHtml(
    title: string,
    baseClauses: string[],
    customClauses: { legalWording: string }[],
    formData: Record<string, string>
): string {
    const interpolatedBaseClauses = baseClauses
        .map(clause =>
            interpolateWithDefaults(clause, formData).replace(/\n/g, "<br />")
        )
        .map(c => `<p>${c}</p>`)
        .join("");

    const interpolatedCustomClauses =
        customClauses.length > 0
            ? `<h2>סעיפים מותאמים אישית</h2>` +
              customClauses
                  .map(c => `<p>${c.legalWording.replace(/\n/g, "<br />")}</p>`)
                  .join("")
            : "";

    // These styles are designed to mimic the TailwindCSS 'prose-sm' class for visual consistency.
    return `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
                body {
                    direction: rtl;
                    font-family: 'Heebo', 'Arial', sans-serif;
                    line-height: 1.75;
                    background-color: #ffffff;
                    color: #374151; /* Corresponds to prose text-gray-700 */
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px 40px;
                }
                h1 {
                    font-size: 1.875rem; /* ~30px, similar to prose-sm h1 */
                    font-weight: 800;
                    color: #111827; /* prose text-gray-900 */
                    margin-bottom: 1.5em;
                    text-align: center;
                }
                h2 {
                    font-size: 1.25rem; /* ~20px */
                    font-weight: 700;
                    color: #111827;
                    margin-top: 2em;
                    margin-bottom: 1em;
                    border-bottom: 1px solid #e5e7eb; /* border-gray-200 */
                    padding-bottom: 0.4em;
                }
                p {
                    margin-bottom: 1.25em; /* prose-sm paragraph margin */
                    text-align: justify;
                }
                strong {
                    color: #111827;
                    font-weight: 700;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                ${interpolatedBaseClauses}
                ${interpolatedCustomClauses}
            </div>
        </body>
        </html>
    `;
}

export const initiateSigningSession = onCall(
  { region: "us-central1" },
  async (request) => {
    logger.info("initiateSigningSession called with data: ", request.data);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { contractId } = request.data;
    if (!contractId || typeof contractId !== "string") {
      throw new HttpsError("invalid-argument", "The function must be called with a valid 'contractId'.");
    }

    const dropboxSignApiKey = process.env.DROPBOX_SIGN_API_KEY;
    const dropboxSignClientId = process.env.DROPBOX_SIGN_CLIENT_ID;

    if (!dropboxSignApiKey || !dropboxSignClientId) {
      logger.error("Dropbox Sign API key or Client ID is not configured.");
      throw new HttpsError(
        "failed-precondition",
        "The Dropbox Sign integration is not configured on the server."
      );
    }

    const signatureRequestApi = new SignatureRequestApi();
    signatureRequestApi.username = dropboxSignApiKey;

    try {
      const contractRef = db.collection("contracts").doc(contractId);
      const contractDoc = await contractRef.get();
      if (!contractDoc.exists) {
        throw new HttpsError("not-found", "Contract not found.");
      }
      const contractData = contractDoc.data();
      if (!contractData) {
        throw new HttpsError("internal", "Contract data is empty.");
      }

      if (!contractData.templateId) {
        throw new HttpsError("failed-precondition", "Contract is missing a template ID.");
      }
      
      const templateRef = db.collection("templates").doc(contractData.templateId);
      const templateDoc = await templateRef.get();
      if (!templateDoc.exists) {
        throw new HttpsError("not-found", "Contract template not found.");
      }
      const templateData = templateDoc.data();

      // ** Generate contract content as HTML **
      const contractTitle = contractData.title || templateData?.title || 'Contract';
      const baseClauses = templateData?.baseClauses || [];
      const customClauses = contractData.customClauses || [];

      const contractHtmlContent = generateContractHtml(
          contractTitle,
          baseClauses,
          customClauses,
          contractData.formData || {}
      );

      // ** Upload to Firebase Storage as an HTML file **
      const bucket = storage.bucket();
      const filePath = `generated_contracts/${contractId}.html`;
      const file = bucket.file(filePath);
      await file.save(Buffer.from(contractHtmlContent, 'utf8'), {
        contentType: 'text/html',
      });
      await file.makePublic();
      const publicUrl = file.publicUrl();
      logger.info(`Contract HTML file uploaded to: ${publicUrl}`);


      if (!contractData.parties || contractData.parties.length === 0) {
        throw new HttpsError("failed-precondition", "Contract has no parties/signers defined.");
      }
      const signers: SubSignatureRequestSigner[] = contractData.parties.map(
        (party: { name: string; email: string }, index: number) => ({
          name: party.name,
          emailAddress: party.email,
          order: index,
        })
      );
      
      const isDevelopment = process.env.FUNCTIONS_EMULATOR === "true";

      const signingOptions: SubSigningOptions = {
        draw: true,
        type: true,
        upload: true,
        phone: false,
        defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
      };

      const signatureRequestData: SignatureRequestCreateEmbeddedRequest = {
        clientId: dropboxSignClientId,
        title: contractData.title || "Contract for Signature",
        subject: `Signature Request: ${contractData.title || "Contract"}`,
        message: "Please review and sign the document.",
        signers,
        fileUrls: [publicUrl],
        testMode: isDevelopment,
        signingOptions: signingOptions,
      };
      logger.info("Prepared signature request data for Dropbox Sign API.", {
        isDevelopment,
      });

      const response = await signatureRequestApi.signatureRequestCreateEmbedded(signatureRequestData);
      const signatureRequest = response.body.signatureRequest;

      if (!signatureRequest || !signatureRequest.signatures || !signatureRequest.signatureRequestId) {
        throw new Error("Invalid response from Dropbox Sign: Missing signature request details.");
      }
      logger.info("Successfully created embedded signature request.", {
        signatureRequestId: signatureRequest.signatureRequestId,
      });
      
      const signatureIdMap = new Map<string, string>();
      signatureRequest.signatures.forEach(sig => {
        if (sig.signerEmailAddress && sig.signatureId) {
          signatureIdMap.set(sig.signerEmailAddress.toLowerCase(), sig.signatureId);
        }
      });
      
      const partiesWithDetails = contractData.parties.map((party: any) => ({
          ...party,
          status: "pending",
          signatureId: signatureIdMap.get(party.email.toLowerCase()) || null,
      }));

      await contractRef.update({
        status: "pending",
        lastUpdatedAt: FieldValue.serverTimestamp(),
        signatureRequestId: signatureRequest.signatureRequestId,
        parties: partiesWithDetails,
        contractFileUrl: publicUrl, // Save the file URL for reference
      });
      logger.info("Updated contract in Firestore with pending status and signature details.", { contractId });

      return { success: true };
    } catch (error: any) {
      logger.error("Error during Dropbox Sign process:", {
        contractId,
        error: error.response ? error.response.body : error.message,
      });
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while initiating the signing session.",
        error.message
      );
    }
  }
);
