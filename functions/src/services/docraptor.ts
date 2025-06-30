// Filepath: /Users/yinon/Repositories/studio/functions/src/services/docraptor.ts
import axios, { isAxiosError } from "axios";
import * as functions from "firebase-functions";
import { logger } from "firebase-functions";

const DOCRAPTOR_API_KEY = process.env.DOCRAPTOR_API_KEY;
const DOCRAPTOR_API_URL = "https://api.docraptor.com/docs"; // Fixed endpoint to match DocRaptor docs

if (!DOCRAPTOR_API_KEY) {
  logger.error("DocRaptor API key is not set in environment variables.");
}

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
  if (!DOCRAPTOR_API_KEY) {
    throw new functions.https.HttpsError(
      "internal",
      "DocRaptor API key is not configured."
    );
  }

  try {
    const response = await axios.post(
      DOCRAPTOR_API_URL,
      {
        user_credentials: DOCRAPTOR_API_KEY,
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
