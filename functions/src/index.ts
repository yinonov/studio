import * as admin from "firebase-admin";
import { onCall, onRequest } from "firebase-functions/v2/https";
import {
  prepareContractForSigning,
  getEmbeddedSignUrlForSigner,
  handleDropboxSignCallback,
} from "./services/dropbox-sign";

admin.initializeApp();

// Callable function to prepare and send a contract for signing
exports.prepareContractForSigning = onCall(async (request) => {
  const { contractId } = request.data;
  return await prepareContractForSigning(contractId, admin.firestore());
});

// Callable function to get a specific signer's embedded URL
exports.getEmbeddedSignUrlForSigner = onCall(async (request) => {
  const { signatureId } = request.data;
  return await getEmbeddedSignUrlForSigner(signatureId);
});

// HTTP function to handle callbacks from Dropbox Sign
exports.dropboxSignCallback = onRequest(async (request, response) => {
  await handleDropboxSignCallback(request, response, admin.firestore());
});
