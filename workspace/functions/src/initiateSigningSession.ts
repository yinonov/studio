
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
import axios from 'axios'; // Import axios for DocRaptor API call

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
const storage = getStorage();

// --- START: Template Definitions Fallback ---
// This data is included as a fallback for when templates are not found in Firestore.
// This mirrors the logic on the client-side to ensure function robustness.

interface TemplateField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "email";
  placeholder?: string;
  required?: boolean;
}

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  fields?: TemplateField[];
  baseClauses?: string[];
}

const defaultRentalFields: TemplateField[] = [
    { id: 'party1Name', label: "שם צד א' (משכיר)", type: 'text', placeholder: 'ישראל ישראלי', required: true },
    { id: 'party1Email', label: "אימייל צד א'", type: 'email', placeholder: 'israel@example.com', required: true },
    { id: 'party2Name', label: "שם צד ב' (שוכר)", type: 'text', placeholder: 'שרה לוי', required: true },
    { id: 'party2Email', label: "אימייל צד ב'", type: 'email', placeholder: 'sarah@example.com', required: true },
    { id: 'address', label: 'כתובת הנכס', type: 'text', placeholder: 'הרצל 1, תל אביב', required: true },
    { id: 'rentAmount', label: 'סכום שכירות חודשי (₪)', type: 'number', placeholder: '5000', required: true },
    { id: 'startDate', label: 'תאריך תחילת שכירות', type: 'date', required: true },
    { id: 'additionalNotes', label: 'הערות נוספות', type: 'textarea', placeholder: 'פרטים נוספים או סעיפים מיוחדים...', required: false },
];

const defaultServiceFields: TemplateField[] = [
    { id: 'party1Name', label: "שם נותן השירות", type: 'text', required: true },
    { id: 'party1Email', label: "אימייל נותן השירות", type: 'email', required: true },
    { id: 'party2Name', label: "שם מקבל השירות", type: 'text', required: true },
    { id: 'party2Email', label: "אימייל מקבל השירות", type: 'email', required: true },
    { id: 'serviceDescription', label: 'תיאור השירות', type: 'textarea', required: true },
    { id: 'serviceFee', label: 'תמורה (₪)', type: 'number', required: true },
];

const defaultTemplates: Template[] = [
    {
      id: 'lease-residential',
      title: "הסכם שכירות דירה",
      category: "נדל\"ן",
      description: "חוזה סטנדרטי למשכירים ושוכרים למגורים.",
      fields: defaultRentalFields,
      baseClauses: [
          "שנערך ונחתם ב{{city||תל אביב}} ביום {{day}} לחודש {{month}} שנת {{year}}",
          "בין: {{party1Name}} (ת.ז. __________) מצד אחד",
          "לבין: {{party2Name}} (ת.ז. __________) מצד שני",
          "הואיל והמשכיר הינו בעל הזכויות בנכס הנמצא בכתובת: {{address}} (להלן: \"המושכר\").",
          "והואיל והשוכר מעוניין לשכור מאת המשכיר את המושכר לתקופה ובתנאים המפורטים להלן.",
          "והואיל והצדדים מסכימים כי דמי השכירות החודשיים יעמדו על סך {{rentAmount}} ש\"ח.",
          "והואיל ותקופת השכירות תחל ביום {{startDate}}."
        ]
    },
    {
      id: 'service-freelance',
      title: "הסכם שירותי פרילנס",
      category: "שירותים",
      description: "חוזה לפרילנסרים המספקים שירותים ללקוחות.",
      fields: defaultServiceFields,
      baseClauses: [
          "שנערך ונחתם ביום {{day}} לחודש {{month}} שנת {{year}}",
          "בין: {{party1Name}} (להלן: \"נותן השירותים\")",
          "לבין: {{party2Name}} (להלן: \"מקבל השירותים\")",
          "הואיל ונותן השירותים עוסק במתן שירותי {{serviceDescription}}.",
          "והואיל ומקבל השירותים מעוניין לקבל מנותן השירותים את השירותים כאמור.",
          "הצדדים הסכימו כי התמורה עבור השירותים תעמוד על {{serviceFee}} ש\"ח."
        ]
    },
    {
      id: 'nda',
      title: "הסכם סודיות (NDA)",
      category: "עסקי",
      description: "הסכם לשמירה על מידע רגיש בין צדדים.",
      fields: [
        { id: 'disclosingParty', label: 'צד מגלה מידע', type: 'text', required: true },
        { id: 'receivingParty', label: 'צד מקבל מידע', type: 'text', required: true },
        { id: 'effectiveDate', label: 'תאריך תחולה', type: 'date', required: true },
        { id: 'confidentialInformationDescription', label: 'תיאור המידע הסודי', type: 'textarea', required: true },
      ],
       baseClauses: [
          "שנערך ונחתם ביום {{effectiveDate}}",
          "בין: {{disclosingParty}} (להלן: \"הצד המגלה\")",
          "לבין: {{receivingParty}} (להלן: \"הצד המקבל\")",
          "הואיל והצד המגלה מתכוון לגלות לצד המקבל מידע סודי (כהגדרתו להלן) למטרת {{purpose||בחינת שיתוף פעולה עסקי}}.",
          "להלן תיאור המידע הסודי: {{confidentialInformationDescription}}"
        ]
    },
];

// --- END: Template Definitions Fallback ---

/**
 * Interpolates contract data into clauses, handling default values.
 * e.g., "Hello, {{name||World}}" with data {} becomes "Hello, World".
 * e.g., "Hello, {{name||World}}" with data {name: "Yinon"} becomes "Hello, Yinon".
 * @param text The string containing placeholders.
 * @param data The data object to fill placeholders.
 * @returns The interpolated string.
 */
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

/**
 * Generates a professionally styled HTML document for the contract.
 * This HTML is sent to DocRaptor for PDF conversion. It includes RTL support
 * and embeds the 'Heebo' font for visual consistency with the app.
 * @param title The contract title.
 * @param baseClauses An array of standard clauses.
 * @param customClauses An array of user-defined custom clauses.
 * @param formData The data filled in by the user.
 * @returns A string containing the full HTML document.
 */
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

    // These styles are designed to create a professional, printable document.
    // They ensure RTL layout and embed the Heebo font for Hebrew text.
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
                    font-size: 1.875rem; /* ~30px */
                    font-weight: 800;
                    color: #111827; /* text-gray-900 */
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
                    margin-bottom: 1.25em;
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

    // 1. AUTHENTICATION & VALIDATION
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { contractId } = request.data;
    if (!contractId || typeof contractId !== "string") {
      throw new HttpsError("invalid-argument", "The function must be called with a valid 'contractId'.");
    }

    const dropboxSignApiKey = process.env.DROPBOX_SIGN_API_KEY;
    const dropboxSignClientId = process.env.DROPBOX_SIGN_CLIENT_ID;
    const docRaptorApiKey = process.env.DOCRAPTOR_API_KEY;

    if (!dropboxSignApiKey || !dropboxSignClientId || !docRaptorApiKey) {
      const missingKeys = [
        !dropboxSignApiKey && "Dropbox Sign API Key",
        !dropboxSignClientId && "Dropbox Sign Client ID",
        !docRaptorApiKey && "DocRaptor API Key",
      ].filter(Boolean).join(', ');
      logger.error(`Server configuration error: Missing API keys: ${missingKeys}`);
      throw new HttpsError(
        "failed-precondition",
        `The server is not configured for signing. Missing: ${missingKeys}.`
      );
    }

    const signatureRequestApi = new SignatureRequestApi();
    signatureRequestApi.username = dropboxSignApiKey;

    try {
      // 2. FETCH CONTRACT & TEMPLATE DATA
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
      
      let templateData: Template | undefined;
      if (templateDoc.exists()) {
        templateData = templateDoc.data() as Template;
      } else {
        logger.warn(`Template ${contractData.templateId} not found in Firestore. Falling back to local definitions.`);
        templateData = defaultTemplates.find(t => t.id === contractData.templateId);
      }
      if (!templateData) {
        throw new HttpsError("not-found", `Contract template '${contractData.templateId}' not found.`);
      }

      // 3. GENERATE PROFESSIONAL HTML DOCUMENT
      const contractTitle = contractData.title || templateData.title || 'Contract';
      const baseClauses = templateData.baseClauses || [];
      const customClauses = contractData.customClauses || [];
      const contractHtmlContent = generateContractHtml(
          contractTitle,
          baseClauses,
          customClauses,
          contractData.formData || {}
      );

      // 4. CONVERT HTML TO PDF/A-2u USING DOCRAPTOR
      logger.info(`Generating PDF for contract ${contractId} via DocRaptor.`);
      const docRaptorPayload = {
        document_content: contractHtmlContent,
        name: `contract_${contractId}.pdf`,
        document_type: 'pdf',
        test: true, // Use 'false' in production. Test documents are watermarked.
        strict: 'pdfa-2u', // Specify PDF/A-2u for compliance and Unicode support.
      };

      let pdfBuffer: Buffer;
      try {
        const docRaptorResponse = await axios.post('https://sync.docraptor.com/docs', docRaptorPayload, {
          auth: {
            username: docRaptorApiKey,
            password: '', // API key is used as username, no password needed.
          },
          responseType: 'arraybuffer', // Important to get the response as a binary buffer.
        });
        pdfBuffer = Buffer.from(docRaptorResponse.data);
        logger.info(`Successfully generated PDF for contract ${contractId}. Size: ${pdfBuffer.length} bytes.`);
      } catch (error: any) {
          const errorDetails = error.response ? (error.response.data.toString('utf-8') || error.response.statusText) : error.message;
          logger.error("Error generating PDF with DocRaptor:", { contractId, error: errorDetails });
          throw new HttpsError("internal", `An error occurred while generating the PDF: ${errorDetails}`);
      }

      // 5. UPLOAD THE GENERATED PDF TO FIREBASE STORAGE (for archival)
      const bucket = storage.bucket();
      const pdfFilePath = `contracts/${contractId}/final_document.pdf`;
      const file = bucket.file(pdfFilePath);
      await file.save(pdfBuffer, { contentType: 'application/pdf' });
      // We will get a signed URL for permanent access if needed later, but will pass the raw buffer to Dropbox Sign.
      const contractFileUrl = (await file.getSignedUrl({ action: 'read', expires: '01-01-2500' }))[0];

      // 6. INITIATE DROPBOX SIGN EMBEDDED SIGNING SESSION
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
        title: contractTitle,
        subject: `Your signature is requested: ${contractTitle}`,
        message: "Please review and sign the attached document.",
        signers,
        // Pass the raw PDF file buffer directly to Dropbox Sign. This is more secure than using public URLs.
        files: [{
            name: `contract_${contractId}.pdf`,
            data: pdfBuffer,
        }],
        testMode: isDevelopment,
        signingOptions: signingOptions,
      };

      const response = await signatureRequestApi.signatureRequestCreateEmbedded(signatureRequestData);
      const signatureRequest = response.body.signatureRequest;

      if (!signatureRequest || !signatureRequest.signatures || !signatureRequest.signatureRequestId) {
        throw new Error("Invalid response from Dropbox Sign: Missing signature request details.");
      }
      logger.info("Successfully created embedded signature request.", {
        signatureRequestId: signatureRequest.signatureRequestId,
      });
      
      // 7. MAP SIGNATURE IDs BACK TO PARTIES AND UPDATE FIRESTORE
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
        contractFileUrl: contractFileUrl, // Save the permanent signed URL for archival.
      });
      logger.info("Updated contract in Firestore with pending status and signature details.", { contractId });

      return { success: true, message: "Signing session initiated successfully." };
    } catch (error: any) {
      logger.error("Critical error during signing session initiation:", {
        contractId,
        errorMessage: error.message,
        errorDetails: error.response ? error.response.body : error.stack,
      });
      // Ensure we pass a clear error message back to the client.
      const message = error instanceof HttpsError ? error.message : "An unexpected error occurred.";
      throw new HttpsError( "internal", message, error.details );
    }
  }
);
