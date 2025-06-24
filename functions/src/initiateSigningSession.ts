
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

    // This HTML structure and CSS are designed to look clean and professional,
    // and to be consistent with the in-app preview.
    return `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    direction: rtl;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f4f4f4;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #fff;
                    border: 1px solid #ddd;
                    padding: 40px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.05);
                }
                h1 {
                    text-align: center;
                    color: #111;
                    font-size: 24px;
                    margin-bottom: 30px;
                }
                h2 {
                    font-size: 18px;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 8px;
                    margin-top: 25px;
                    margin-bottom: 15px;
                }
                p {
                    margin-bottom: 1em;
                    text-align: justify;
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
