import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();

import { getEmbeddedSignUrl } from "./services/dropbox-sign";

export const testDropboxSign = onCall(async (_data, _context) => {
  try {
    await getEmbeddedSignUrl();
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError("internal", "Dropbox Sign dummy call failed.");
  }
});
