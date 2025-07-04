
import { getEmbeddedSignUrl } from "./services/dropbox-sign";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/onCall";
// import { getFirestore } from "firebase-admin/firestore";
// import { StoredContractDataSchema, RequestDataSchema } from "./types/schemas";

// const db = getFirestore();

/**
 * Creates a signable document with DUMMY data and prepares it for embedded signing
 * using Dropbox Sign. This function is for testing and bypasses Firestore.
 */
export const prepareContractForSigning = onCall(
  { memory: "1GiB", timeoutSeconds: 300 },
  async (request) => {
    // 1. Validate that the user is authenticated (still a good practice)
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to prepare a contract for signing."
      );
    }

    try {
      functions.logger.info("Using DUMMY data to prepare contract for signing.");

      // 2. Create a DUMMY contract object instead of fetching from Firestore.
      const dummyContract = {
        title: "Dummy Test Contract for Signing",
        parties: [
          { email: "signer1@example.com", name: "Dummy Signer One" },
          { email: "signer2@example.com", name: "Dummy Signer Two" },
        ],
        formData: {
          testField: "Some test data for the contract body.",
        },
      };

      // 3. Generate a robust, well-formed HTML document for signing using the dummy data.
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${dummyContract.title}</title>
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; text-align: right; direction: rtl;}
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
  <h1>${dummyContract.title}</h1>
  <p>זהו חוזה בדיקה שנוצר למטרות ניפוי שגיאות.</p>
  <p><strong>נתוני בדיקה:</strong> ${JSON.stringify(
    dummyContract.formData,
    null,
    2
  )}</p>
  <br/><br/><br/><br/>
  <p><strong>חתימה עבור צד א':</strong></p>
  <div class="sig-container">
    [sig|req|signer1|נא לחתום כאן]
  </div>
  <p><strong>חתימה עבור צד ב':</strong></p>
   <div class="sig-container">
    [sig|req|signer2|נא לחתום כאן]
  </div>
</body>
</html>`;

      functions.logger.info("Generated HTML for DUMMY contract.");

      // 4. Call Dropbox Sign with the dummy data to create the embedded signing request
      const htmlBuffer = Buffer.from(htmlContent, "utf-8");
      const signers = dummyContract.parties;

      const signResult = await getEmbeddedSignUrl(
        htmlBuffer,
        signers,
        dummyContract.title
      );

      // 5. Return the signing URL directly to the client without updating Firestore.
      functions.logger.info("Dummy contract is now ready for signature.");
      return { success: true, ...signResult };
    } catch (error: any) {
      functions.logger.error(
        `Error preparing DUMMY contract for signing:`,
        error
      );
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred while preparing the DUMMY contract."
      );
    }
  }
);
