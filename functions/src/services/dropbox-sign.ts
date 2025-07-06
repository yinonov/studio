import { defineString } from "firebase-functions/params";
import * as fs from "fs";
import {
  SignatureRequestApi,
  SignatureRequestCreateEmbeddedRequest,
  SubSignatureRequestSigner,
  SubSigningOptions,
} from "@dropbox/sign";
import * as functions from "firebase-functions";
import * as os from "os";

// Define Firebase params for security
const dropboxSignApiKeyParam = defineString("DROPBOX_SIGN_API_KEY");
const dropboxSignClientIdParam = defineString("DROPBOX_SIGN_CLIENT_ID");

/**
 * Creates an embedded signature request using Dropbox Sign.
 *
 * @param htmlBuffer The HTML content of the contract as a Buffer.
 * @param signers An array of signers for the document.
 * @param title The title of the document.
 * @returns An object with the sign URL and the signature request ID.
 */
export const getEmbeddedSignUrl = async () => {
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
  // apiCaller.accessToken = "YOUR_ACCESS_TOKEN";

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

  apiCaller
    .signatureRequestCreateEmbedded(signatureRequestCreateEmbeddedRequest)
    .then((response) => {
      functions.logger.info("Dropbox Sign API response", {
        response: response.body,
      });
      console.log(response.body);
      // Clean up temp file
      fs.unlinkSync(tempHtmlPath);
    })
    .catch((error) => {
      functions.logger.error(
        "Exception when calling SignatureRequestApi#signatureRequestCreateEmbedded:",
        error.body || error
      );
      console.log(
        "Exception when calling SignatureRequestApi#signatureRequestCreateEmbedded:"
      );
      console.log(error.body);
      // Clean up temp file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }
    });
};
