import { getClientFunctions } from '@/lib/firebase';
import type { SignatureRequestGetResponse } from '@dropbox/sign';
import { httpsCallable } from 'firebase/functions';

/**
 * Fetches the Dropbox Sign signature request object for a contract from the backend (using Firebase callable function).
 * @param contractId The contract ID
 * @returns The Dropbox Sign signature request object
 */
export async function fetchDropboxSignSignatureRequest(contractId: string) {
  const functions = getClientFunctions();
  const getDropboxSignData = httpsCallable<string, SignatureRequestGetResponse>(
    functions,
    'getContractDropboxSignData'
  );
  const result = await getDropboxSignData(contractId);
  return result.data;
}

/**
 * Fetches the embedded signing URL for a given Dropbox Sign signature ID.
 * @param signatureId The Dropbox Sign signature ID
 * @returns The embedded signing URL
 */
export async function getSignUrl(
  signatureId: string
): Promise<{ signUrl: string }> {
  const functions = getClientFunctions();
  const getUrlFunction = httpsCallable(
    functions,
    'getEmbeddedSignUrlForSigner'
  );
  const result = await getUrlFunction({ signatureId });
  return result.data as { signUrl: string };
}
