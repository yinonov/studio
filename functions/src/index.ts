import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

/**
 * MOCK IMPLEMENTATION: Initiates a mock signing session.
 * This function is a temporary placeholder for debugging deployment issues.
 * It does not connect to any external e-signature provider.
 */
export const initiateSigningSession = onCall(
  { cors: true },
  async (request) => {
    logger.info("[MOCK] initiateSigningSession called with data: ", request.data);

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const contractId = request.data.contractId;
    if (!contractId || typeof contractId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with a valid 'contractId'."
      );
    }

    logger.info(`[MOCK] Generating a mock signing URL for contract ${contractId}.`);

    // In this mock version, we simply return a URL that redirects to a success page.
    // The client-side code will load this in the iframe.
    // We can point it to the success page of the app itself.
    const mockSigningUrl = "/signing/success";

    // Simulate a short delay as a real API call would take time.
    await new Promise(resolve => setTimeout(resolve, 500));

    logger.info(`[MOCK] Successfully generated mock URL: ${mockSigningUrl}`);

    return { signingUrl: mockSigningUrl };
  }
);
