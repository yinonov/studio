// Filepath: /Users/yinon/Repositories/studio/functions/src/services/docraptor.ts
import axios, { isAxiosError } from "axios";
import * as functions from "firebase-functions";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";

const DOCRAPTOR_API_KEY = process.env.DOCRAPTOR_API_KEY;
const DOCTORAPTOR_API_URL = "https://docraptor.com/docs";
const DOCRAPTOR_STATUS_URL = "https://docraptor.com/status";

if (!DOCRAPTOR_API_KEY) {
  logger.error("DocRaptor API key is not set in environment variables.");
}

interface DocRaptorStatusResponse {
  status: "completed" | "failed" | "working";
  download_url?: string;
  number_of_pages?: number;
  validation_errors?: string;
}

interface DocRaptorAsyncCreateResponse {
  status_id: string;
}

/**
 * Initiates PDF generation with DocRaptor.
 * @param htmlContent The HTML content of the document.
 * @param test Whether to use DocRaptor's test mode.
 * @returns The status ID of the generation job.
 */
export async function createPdf(
  htmlContent: string,
  test = true
): Promise<string> {
  if (!DOCRAPTOR_API_KEY) {
    throw new functions.https.HttpsError(
      "internal",
      "DocRaptor API key is not configured."
    );
  }

  try {
    const response = await axios.post<DocRaptorAsyncCreateResponse>(
      DOCTORAPTOR_API_URL,
      {
        doc: {
          document_content: htmlContent,
          type: "pdf",
          name: "contract.pdf",
          test: test,
          prince_options: {
            pdf_a: true,
          },
        },
        pipeline: "prince",
      },
      {
        auth: {
          username: DOCRAPTOR_API_KEY, // Already checked for existence
          password: "",
        },
      }
    );

    return response.data.status_id;
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

/**
 * Polls DocRaptor for the status of a PDF generation job.
 * @param statusId The status ID of the job.
 * @returns The download URL of the completed PDF.
 */
export async function pollForPdf(statusId: string): Promise<string> {
  if (!DOCRAPTOR_API_KEY) {
    throw new functions.https.HttpsError(
      "internal",
      "DocRaptor API key is not configured."
    );
  }
  const statusUrl = `${DOCRAPTOR_STATUS_URL}/${statusId}`;
  const maxAttempts = 30; // 5 seconds * 30 = 2.5 minutes timeout
  const pollInterval = 5000; // 5 seconds

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    try {
      const response = await axios.get<DocRaptorStatusResponse>(statusUrl, {
        auth: { username: DOCRAPTOR_API_KEY, password: "" },
      });

      const {
        status,
        download_url: downloadUrl,
        validation_errors: validationErrors,
      } = response.data;

      if (status === "completed") {
        if (!downloadUrl) {
          throw new Error(
            "DocRaptor job completed but no download URL was provided."
          );
        }
        return downloadUrl;
      } else if (status === "failed") {
        logger.error("DocRaptor job failed:", validationErrors);
        throw new Error(`PDF generation failed: ${validationErrors}`);
      }
    } catch (error) {
      logger.error(
        `Error polling DocRaptor status for job ${statusId}:`,
        error
      );
      if (isAxiosError(error) && error.response) {
        logger.error("DocRaptor error response:", error.response.data);
      }
      throw new Error(`Failed to get status for DocRaptor job ${statusId}.`);
    }
  }

  throw new Error(`DocRaptor job ${statusId} timed out.`);
}

/**
 * Downloads a PDF from a URL and saves it to Cloud Storage.
 * @param downloadUrl The URL to download the PDF from.
 * @param contractId The ID of the contract.
 * @returns The gs:// path of the saved PDF.
 */
export async function downloadAndSavePdf(
  downloadUrl: string,
  contractId: string
): Promise<string> {
  const response = await axios.get(downloadUrl, {
    responseType: "arraybuffer",
  });
  const pdfBuffer = Buffer.from(response.data);

  const bucket = getStorage().bucket();
  const filePath = `contracts/${contractId}/contract.pdf`;
  const file = bucket.file(filePath);

  await file.save(pdfBuffer, {
    metadata: { contentType: "application/pdf" },
  });

  // Generate a long-lived signed URL for the file, expiring in 100 years.
  // This provides a secure and accessible URL to be stored in Firestore.
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 100);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: expirationDate,
  });

  return signedUrl;
}
