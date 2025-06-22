import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * [DEBUG STEP 1]
 * A mock function to test configuration access and deployment.
 * It reads the Dropbox Sign API key and Client ID from environment variables
 * and returns their presence to the client.
 */
export const initiateSigningSession = onCall(
  { region: "us-central1" },
  (request) => {
    logger.info("[DEBUG] initiateSigningSession called.", {
      auth: request.auth,
      data: request.data,
    });

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      const apiKey = process.env.DROPBOX_SIGN_API_KEY;
      const clientId = process.env.DROPBOX_SIGN_CLIENT_ID;

      logger.info("[DEBUG] Reading environment variables...", {
        apiKeyFound: !!apiKey,
        clientIdFound: !!clientId,
      });

      if (!apiKey || !clientId) {
        logger.error(
          "[DEBUG] Dropbox Sign API Key or Client ID is not configured in environment variables."
        );
        // Do not return secrets to the client.
        return {
          message:
            "Configuration missing: Please check server logs for details.",
          configStatus: {
            apiKeyFound: !!apiKey,
            clientIdFound: !!clientId,
          },
        };
      }

      // Do not return secrets to the client.
      return {
        message: "Configuration read successfully.",
        configStatus: {
          apiKeyFound: true,
          clientIdFound: true,
        },
      };
    } catch (error: unknown) {
      logger.error("[DEBUG] Error reading environment variables", error);
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new HttpsError(
        "internal",
        "An error occurred while reading configuration.",
        errorMessage
      );
    }
  }
);
