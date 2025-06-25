import { Bucket } from "@google-cloud/storage";
import { fromPath } from "pdf2pic";
import sharp from "sharp";
import * as functions from "firebase-functions";

export async function generateThumbnail(
  pdfPath: string,
  bucket: Bucket,
  destinationPath: string,
): Promise<void> {
  const options = {
    density: 100, // output pixels per inch
    saveFilename: "thumbnail", // output file name
    savePath: "/tmp", // output file location
    format: "png", // output file format
    width: 600,
    height: 600,
  };

  try {
    const convert = fromPath(pdfPath, options);
    const conversionResult = await convert(1, { responseType: "image" });

    if (!conversionResult?.path) {
      throw new Error("PDF to image conversion failed.");
    }

    const imageBuffer = await sharp(conversionResult.path)
      .composite([
        {
          input: Buffer.from(
            `<svg width="600" height="600">
              <text
                x="50%"
                y="50%"
                dominant-baseline="middle"
                text-anchor="middle"
                font-size="100"
                font-family="sans-serif"
                fill="rgba(255, 0, 0, 0.4)"
                transform="rotate(-45 300 300)"
              >
                DRAFT
              </text>
            </svg>`,
          ),
          gravity: "center",
        },
      ])
      .toBuffer();

    const file = bucket.file(destinationPath);
    await file.save(imageBuffer, {
      metadata: {
        contentType: "image/png",
      },
    });

    functions.logger.log(`Thumbnail uploaded to ${destinationPath}`);
  } catch (error) {
    functions.logger.error("Error generating thumbnail:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Could not generate thumbnail.",
    );
  }
}
