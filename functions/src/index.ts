
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { DropboxSign } from "dropbox-sign"; // Renamed from HelloSign to DropboxSign

admin.initializeApp();

const dropboxSignApiKey = functions.config().dropbox_sign?.apikey;
if (!dropboxSignApiKey) {
  logger.error("Dropbox Sign API key is not configured. Set with: firebase functions:config:set dropbox_sign.apikey=\"YOUR_API_KEY\"");
}
const dropboxSign = new DropboxSign({ key: dropboxSignApiKey });


/**
 * Initiates an embedded signing session with Dropbox Sign.
 */
export const initiateSigningSession = onCall(async (request) => {
  logger.info("initiateSigningSession called with data: ", request.data);

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  if (!dropboxSignApiKey) {
    logger.error("Dropbox Sign API key is missing in function configuration.");
    throw new HttpsError(
      "internal",
      "E-signature service is not configured correctly. API key missing."
    );
  }

  const contractId = request.data.contractId;
  if (!contractId || typeof contractId !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'contractId'."
    );
  }

  const userId = request.auth.uid;

  // 1. Fetch contract details from Firestore
  let contractData;
  let signerEmail: string | undefined;
  let contractTitle: string | undefined;

  try {
    const contractDoc = await admin.firestore().collection('contracts').doc(contractId).get();
    if (!contractDoc.exists) {
      throw new HttpsError('not-found', `Contract with ID ${contractId} not found.`);
    }
    contractData = contractDoc.data();
    if (!contractData) {
        throw new HttpsError('internal', `Failed to read data for contract ${contractId}.`);
    }
    
    contractTitle = contractData.title || `Contract ${contractId}`;
    // For MVP, assume the first party is the signer
    if (contractData.parties && contractData.parties.length > 0 && contractData.parties[0].email) {
      signerEmail = contractData.parties[0].email;
    } else {
      // Fallback to the initiator's email if no party email is found (adjust as needed)
      signerEmail = request.auth.token.email; 
      if(!signerEmail) {
        throw new HttpsError('invalid-argument', 'Signer email is not available for the contract or the initiator.');
      }
      logger.warn(`No specific party email found for contract ${contractId}. Using initiator's email: ${signerEmail}`);
    }

  } catch (error: any) {
    logger.error(`Error fetching contract ${contractId} from Firestore:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to fetch contract details: ${error.message}`);
  }

  // 2. Prepare the signature request for Dropbox Sign
  // For MVP, use a placeholder document URL. Replace with your actual document generation/URL.
  // This MUST be a publicly accessible URL for Dropbox Sign to fetch it.
  const placeholderDocumentUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
  
  const signatureRequestOptions = {
    test_mode: true,
    clientId: functions.config().dropbox_sign?.clientid, // You'll get this from your Dropbox Sign API App settings
    title: contractTitle,
    subject: `Please sign: ${contractTitle}`,
    message: `Please review and sign the document: ${contractTitle}. Initiated by user ${userId}.`,
    signers: [
      {
        email_address: signerEmail as string, // Assert as string as we check for it above
        name: contractData?.parties?.[0]?.name || 'Signer', // Use party name or generic 'Signer'
      },
      // Add more signers here if needed
    ],
    file_urls: [placeholderDocumentUrl],
    metadata: {
      contractId: contractId,
      userId: userId,
    },
    // signing_options: {
    //  draw: true, // Allow drawing signature
    //  type: true, // Allow typing signature
    //  upload: false, // Disallow uploading signature
    //  phone: false, // Disallow phone signature
    //  default_type: 'draw',
    // },
  };

  if (!signatureRequestOptions.clientId) {
    logger.error("Dropbox Sign Client ID is not configured. This is required for embedded signing. Set with: firebase functions:config:set dropbox_sign.clientid=\"YOUR_CLIENT_ID\"");
     throw new HttpsError(
      "internal",
      "E-signature service is not configured correctly. Client ID missing."
    );
  }

  try {
    logger.info("Sending signature request to Dropbox Sign with options:", JSON.stringify({
        ...signatureRequestOptions, 
        signers: signatureRequestOptions.signers.map(s => ({...s, email_address: "[REDACTED]"}) ) // Avoid logging PII
    }));

    const sigRequest = await dropboxSign.signatureRequest.createEmbedded(signatureRequestOptions);

    if (!sigRequest.signature_request?.signatures?.[0]?.signature_id) {
         logger.error("Failed to get signature_id from Dropbox Sign response:", sigRequest);
        throw new Error("Dropbox Sign response did not include a signature ID.");
    }
    const signatureId = sigRequest.signature_request.signatures[0].signature_id;

    logger.info(`Signature request created: ${sigRequest.signature_request.signature_request_id}, signature_id for signer 0: ${signatureId}`);
    
    const embeddedResponse = await dropboxSign.embedded.getSignUrl(signatureId);
    
    const signUrl = embeddedResponse.embedded?.sign_url;

    if (!signUrl) {
      logger.error("Failed to get embedded sign_url from Dropbox Sign:", embeddedResponse);
      throw new Error("Could not retrieve the embedded signing URL from Dropbox Sign.");
    }

    logger.info(`Successfully generated Dropbox Sign embedded URL for contract ${contractId}.`);
    
    // Update contract in Firestore with the signature_request_id for tracking (optional but good practice)
    await admin.firestore().collection('contracts').doc(contractId).set({
        dropboxSignRequestId: sigRequest.signature_request.signature_request_id,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { signingUrl: signUrl };

  } catch (apiError: any) {
    logger.error("Dropbox Sign API call failed:", apiError.response?.data || apiError.message || apiError);
    let errorMessage = "Failed to initiate signing session with the e-signature provider.";
    if (apiError.response?.data?.error?.error_msg) {
        errorMessage = `E-signature provider error: ${apiError.response.data.error.error_msg}`;
    } else if (apiError.message) {
        errorMessage = `E-signature provider error: ${apiError.message}`;
    }
    throw new HttpsError('internal', errorMessage);
  }
});

// --- Webhook for Dropbox Sign (Placeholder) ---
// You'll need to create a separate HTTP function to handle webhooks from Dropbox Sign.
// This function will be called by Dropbox Sign when events occur (e.g., signature_request_signed).
// Configure the webhook URL in your Dropbox Sign API App settings.
/*
export const dropboxSignWebhook = functions.https.onRequest(async (req, res) => {
  logger.info("Dropbox Sign Webhook received event.");

  // IMPORTANT: Verify the event is from Dropbox Sign (see their documentation for webhook security)
  // This often involves checking a hash of the event data against your API key or a secret.
  // For example:
  // const DROPBOX_SIGN_API_KEY = functions.config().dropbox_sign.apikey;
  // const eventTime = req.body.event.event_time;
  // const eventType = req.body.event.event_type;
  // const hash = crypto.createHmac('sha256', DROPBOX_SIGN_API_KEY)
  //                   .update(eventTime + eventType)
  //                   .digest('hex');
  // if (req.body.event.event_hash !== hash) {
  //    logger.warn("Webhook event hash mismatch. Potential spoofing attempt.");
  //    res.status(403).send("Forbidden");
  //    return;
  // }


  if (req.body.event && req.body.event.event_type === 'signature_request_signed') {
    const sigRequest = req.body.signature_request;
    const contractId = sigRequest.metadata.contractId;

    if (contractId) {
      logger.info(`Webhook: Contract ${contractId} signed. Updating status in Firestore.`);
      try {
        await admin.firestore().collection('contracts').doc(contractId).update({
          status: 'completed',
          signedAt: admin.firestore.FieldValue.serverTimestamp(), // Or use event_time from webhook
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`Contract ${contractId} status updated to completed.`);
      } catch (error) {
        logger.error(`Error updating contract ${contractId} from webhook:`, error);
        // Respond with 500 so Dropbox Sign retries if appropriate, or handle error
        res.status(500).send("Error processing event");
        return;
      }
    } else {
      logger.warn("Webhook: contractId not found in signature_request metadata.");
    }
  } else {
    logger.info("Webhook: Received non-signing event or unhandled event type:", req.body.event?.event_type);
  }

  // IMPORTANT: Dropbox Sign expects a "Hello API Event Received" response for successful webhook processing.
  res.status(200).send("Hello API Event Received");
});
*/
    