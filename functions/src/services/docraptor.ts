// Filepath: /Users/yinon/Repositories/studio/functions/src/services/docraptor.ts
import axios, { isAxiosError } from "axios";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";
import { defineString } from "firebase-functions/params";

const docraptorApiKeyParam = defineString("DOCRAPTOR_API_KEY");
const docraptorApiUrl = "https://api.docraptor.com/docs"; // Fixed endpoint to match DocRaptor docs

/**
 * Initiates PDF generation with DocRaptor and returns a Buffer.
 * @param htmlContent The HTML content of the document.
 * @param test Whether to use DocRaptor's test mode.
 * @returns The PDF as a Buffer.
 */
export async function createPdfBuffer(
  htmlContent: string,
  test = true
): Promise<Buffer> {
  const docraptorApiKey = docraptorApiKeyParam.value();
  if (!docraptorApiKey) {
    throw new functions.https.HttpsError(
      "internal",
      "DocRaptor API key is not configured."
    );
  }

  try {
    const response = await axios.post(
      docraptorApiUrl,
      {
        user_credentials: docraptorApiKey,
        doc: {
          document_content: htmlContent,
          type: "pdf",
          name: "contract.pdf",
          test,
          prince_options: { pdf_a: true },
        },
        pipeline: "prince",
      },
      {
        headers: { "Content-Type": "application/json" },
        responseType: "arraybuffer",
      }
    );
    return Buffer.from(response.data);
  } catch (error) {
    logger.error("Error creating PDF with DocRaptor:", error);
    if (isAxiosError(error) && error.response) {
      logger.error("DocRaptor error response:", error.response.data);
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to initiate PDF generation with DocRaptor."
    );
  }
}
