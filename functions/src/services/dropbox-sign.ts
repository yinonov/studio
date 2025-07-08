import { defineString } from "firebase-functions/params";
import * as fs from "fs";
import {
  SignatureRequestApi,
  SignatureRequestCreateEmbeddedRequest,
  type SignatureRequestResponse,
  SubSignatureRequestSigner,
  SubSigningOptions,
} from "@dropbox/sign";
import * as functions from "firebase-functions";
import * as os from "os";

// Define Firebase params for security
const dropboxSignApiKeyParam = defineString("DROPBOX_SIGN_API_KEY");
const dropboxSignClientIdParam = defineString("DROPBOX_SIGN_CLIENT_ID");

/**
 * Creates a Dropbox Sign signature request and returns its ID.
 *
 * @returns The Dropbox Sign signature request ID or null.
 */
export const createDropboxSignSignatureRequest: () => Promise<
  SignatureRequestResponse["signatureRequestId"]
> = async () => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const dropboxSignClientId = dropboxSignClientIdParam.value();

  functions.logger.info("getEmbeddedSignUrl called", {
    dropboxSignApiKeyPresent: !!dropboxSignApiKey,
    dropboxSignClientIdPresent: !!dropboxSignClientId,
  });

  functions.logger.info("Initializing Dropbox Sign API client", {
    dropboxSignApiKey: dropboxSignApiKey,
    dropboxSignClientId: dropboxSignClientId,
  });

  const apiCaller = new SignatureRequestApi();
  apiCaller.username = dropboxSignApiKey;

  functions.logger.info("Dropbox Sign API initialized", {
    username: apiCaller.username,
  });

  const signingOptions: SubSigningOptions = {
    defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
    draw: true,
    phone: false,
    type: true,
    upload: true,
  };

  const signers1: SubSignatureRequestSigner = {
    name: "Jack",
    emailAddress: "jack@example.com",
    order: 0,
  };

  const signers2: SubSignatureRequestSigner = {
    name: "Jill",
    emailAddress: "jill@example.com",
    order: 1,
  };

  functions.logger.info("Signers defined", {
    signers1: { name: signers1.name, email: signers1.emailAddress },
    signers2: { name: signers2.name, email: signers2.emailAddress },
  });

  const signers = [signers1, signers2];

  // Create a dummy HTML file in the temp directory
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dummy Test Contract for Signing</title>
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
  <h1>Dummy Test Contract for Signing</h1>
  <p>זהו חוזה בדיקה שנוצר למטרות ניפוי שגיאות.</p>
  <p><strong>נתוני בדיקה:</strong> {"testField": "Some test data for the contract body."}</p>
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

  functions.logger.info("Creating dummy HTML content for Dropbox Sign", {
    htmlContent: htmlContent.slice(0, 100) + "...", // Log only the first 100 characters
  });
  const tempHtmlPath = os.tmpdir() + "/dummy-contract-" + Date.now() + ".html";
  fs.writeFileSync(tempHtmlPath, htmlContent, "utf-8");
  functions.logger.info("Created dummy HTML file for Dropbox Sign", {
    tempHtmlPath,
    fileExists: fs.existsSync(tempHtmlPath),
  });

  functions.logger.info("HTML created", {
    htmlContent: htmlContent.slice(0, 100) + "...", // Log only the first 100 characters
    tempHtmlPath,
    fileExists: fs.existsSync(tempHtmlPath),
  });

  const signatureRequestCreateEmbeddedRequest: SignatureRequestCreateEmbeddedRequest =
    {
      clientId: dropboxSignClientId,
      message:
        "Please sign this NDA and then we can discuss more. Let me know if you\nhave any questions.",
      subject: "The NDA we talked about",
      testMode: true,
      title: "NDA with Acme Co.",
      ccEmailAddresses: ["lawyer1@dropboxsign.com", "lawyer2@dropboxsign.com"],
      files: [fs.createReadStream(tempHtmlPath)],
      signingOptions: signingOptions,
      signers: signers,
    };

  functions.logger.info("About to call signatureRequestCreateEmbedded", {
    request: {
      clientId: dropboxSignClientId,
      signers,
      fileExists: fs.existsSync(tempHtmlPath),
    },
  });

  try {
    const response = await apiCaller.signatureRequestCreateEmbedded(
      signatureRequestCreateEmbeddedRequest
    );
    functions.logger.info("Dropbox Sign API response", {
      response: response.body,
    });
    // Clean up temp file with error handling
    try {
      fs.unlinkSync(tempHtmlPath);
      functions.logger.info("Temp HTML file deleted successfully", { tempHtmlPath });
    } catch (unlinkErr) {
      functions.logger.error("Failed to delete temp HTML file", { tempHtmlPath, error: unlinkErr });
    }
    // Robustly check for signatureRequestId
    const signatureRequestId = response.body?.signatureRequest?.signatureRequestId;
    if (!signatureRequestId) {
      functions.logger.error(
        "Dropbox Sign response missing signatureRequestId",
        {
          response: response.body,
        }
      );
      throw new Error("Dropbox Sign did not return a signatureRequestId");
    }
    functions.logger.info("Returning signatureRequestId", { signatureRequestId });
    return signatureRequestId;
  } catch (error: unknown) {
    // Type guard for error with 'body' property
    let errorBody = error;
    if (
      typeof error === "object" &&
      error !== null &&
      Object.prototype.hasOwnProperty.call(error, "body")
    ) {
      errorBody = (error as { body: unknown }).body;
    }
    functions.logger.error(
      "Exception when calling SignatureRequestApi#signatureRequestCreateEmbedded:",
      errorBody
    );
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
    throw error;
  }
};

/**
 * Fetches a Dropbox Sign signature request by its ID.
 * @param signatureRequestId The Dropbox Sign signature request ID.
 * @returns The signature request data from Dropbox Sign.
 */
export const getDropboxSignSignatureRequest = async (signatureRequestId: string) => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const apiCaller = new SignatureRequestApi();
  apiCaller.username = dropboxSignApiKey;
  try {
    const response = await apiCaller.signatureRequestGet(signatureRequestId);
    return response.body;
  } catch (error) {
    functions.logger.error("Error fetching Dropbox Sign signature request", { signatureRequestId, error });
    throw error;
  }
};
