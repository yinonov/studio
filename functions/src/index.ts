import * as admin from "firebase-admin";

admin.initializeApp();

// Export the new, streamlined functions
export { prepareContractForSigning } from "./documents";
export { dropboxSignCallback } from "./signing";
