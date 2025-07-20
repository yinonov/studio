import { defineString } from 'firebase-functions/params';
import * as fs from 'fs';
import {
  SignatureRequestApi,
  SignatureRequestCreateEmbeddedRequest,
  type SignatureRequestResponse,
  SubSignatureRequestSigner,
  SubSigningOptions,
} from '@dropbox/sign';
import * as functions from 'firebase-functions';
import * as os from 'os';
import { EmbeddedApi } from '@dropbox/sign';

// Define Firebase params for security
const dropboxSignApiKeyParam = defineString('DROPBOX_SIGN_API_KEY');
const dropboxSignClientIdParam = defineString('DROPBOX_SIGN_CLIENT_ID');

interface CreateSignatureRequestParams {
  contractTitle: string;
  contractHtml: string;
  signers: Array<{
    name: string;
    email: string;
    order: number;
  }>;
}

/**
 * Creates a Dropbox Sign signature request and returns its ID.
 *
 * @param params Contract parameters including HTML content and signers
 * @returns The Dropbox Sign signature request ID or null.
 */
export const createDropboxSignSignatureRequest = async (
  params: CreateSignatureRequestParams
): Promise<SignatureRequestResponse['signatureRequestId']> => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const dropboxSignClientId = dropboxSignClientIdParam.value();

  functions.logger.info('createDropboxSignSignatureRequest called', {
    dropboxSignApiKeyPresent: !!dropboxSignApiKey,
    dropboxSignClientIdPresent: !!dropboxSignClientId,
    contractTitle: params.contractTitle,
    signersCount: params.signers.length,
  });

  functions.logger.info('Initializing Dropbox Sign API client', {
    dropboxSignApiKey: dropboxSignApiKey,
    dropboxSignClientId: dropboxSignClientId,
  });

  const apiCaller = new SignatureRequestApi();
  apiCaller.username = dropboxSignApiKey;

  functions.logger.info('Dropbox Sign API initialized', {
    username: apiCaller.username,
  });

  const signingOptions: SubSigningOptions = {
    defaultType: SubSigningOptions.DefaultTypeEnum.Draw,
    draw: true,
    phone: false,
    type: true,
    upload: true,
  };

  // Convert the signers to Dropbox Sign format
  const dropboxSignSigners: SubSignatureRequestSigner[] = params.signers.map(
    signer => ({
      name: signer.name,
      emailAddress: signer.email,
      order: signer.order,
    })
  );

  functions.logger.info('Signers defined', {
    signers: dropboxSignSigners.map(s => ({
      name: s.name,
      email: s.emailAddress,
      order: s.order,
    })),
  });

  // Create HTML file with the actual contract content in the temp directory
  const tempHtmlPath = os.tmpdir() + '/contract-' + Date.now() + '.html';
  fs.writeFileSync(tempHtmlPath, params.contractHtml, 'utf-8');
  functions.logger.info('Created contract HTML file for Dropbox Sign', {
    tempHtmlPath,
    fileExists: fs.existsSync(tempHtmlPath),
    htmlLength: params.contractHtml.length,
  });

  functions.logger.info('HTML created', {
    tempHtmlPath,
    fileExists: fs.existsSync(tempHtmlPath),
  });

  const signatureRequestCreateEmbeddedRequest: SignatureRequestCreateEmbeddedRequest =
    {
      clientId: dropboxSignClientId,
      message:
        'Please sign this contract. Let me know if you have any questions.',
      subject: params.contractTitle,
      testMode: true,
      title: params.contractTitle,
      files: [fs.createReadStream(tempHtmlPath)],
      signingOptions: signingOptions,
      signers: dropboxSignSigners,
    };

  functions.logger.info('About to call signatureRequestCreateEmbedded', {
    request: {
      clientId: dropboxSignClientId,
      signers: dropboxSignSigners,
      fileExists: fs.existsSync(tempHtmlPath),
    },
  });

  try {
    const response = await apiCaller.signatureRequestCreateEmbedded(
      signatureRequestCreateEmbeddedRequest
    );
    functions.logger.info('Dropbox Sign API response', {
      response: response.body,
    });
    // Clean up temp file with error handling
    try {
      fs.unlinkSync(tempHtmlPath);
      functions.logger.info('Temp HTML file deleted successfully', {
        tempHtmlPath,
      });
    } catch (unlinkErr) {
      functions.logger.error('Failed to delete temp HTML file', {
        tempHtmlPath,
        error: unlinkErr,
      });
    }
    // Robustly check for signatureRequestId
    const signatureRequestId =
      response.body?.signatureRequest?.signatureRequestId;
    if (!signatureRequestId) {
      functions.logger.error(
        'Dropbox Sign response missing signatureRequestId',
        {
          response: response.body,
        }
      );
      throw new Error('Dropbox Sign did not return a signatureRequestId');
    }
    functions.logger.info('Returning signatureRequestId', {
      signatureRequestId,
    });
    return signatureRequestId;
  } catch (error: unknown) {
    // Type guard for error with 'body' property
    let errorBody = error;
    if (
      typeof error === 'object' &&
      error !== null &&
      Object.prototype.hasOwnProperty.call(error, 'body')
    ) {
      errorBody = (error as { body: unknown }).body;
    }
    functions.logger.error(
      'Exception when calling SignatureRequestApi#signatureRequestCreateEmbedded:',
      errorBody
    );
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
    throw error;
  }
};

/**
 * Fetches a Dropbox Sign signature request by its ID.
 * @param signatureRequestId The Dropbox Sign signature request ID.
 * @returns The signature request data from Dropbox Sign.
 */
export const getDropboxSignSignatureRequest = async (
  signatureRequestId: string
) => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const apiCaller = new SignatureRequestApi();
  apiCaller.username = dropboxSignApiKey;
  try {
    const response = await apiCaller.signatureRequestGet(signatureRequestId);
    return response.body;
  } catch (error) {
    functions.logger.error('Error fetching Dropbox Sign signature request', {
      signatureRequestId,
      error,
    });
    throw error;
  }
};

/**
 * Gets the embedded signing URL for a given signatureId (Dropbox Sign signature ID).
 * @param signatureId The Dropbox Sign signature ID for the signer.
 * @returns The embedded signing URL for the signer.
 */
export const getEmbeddedSignUrl = async (signatureId: string) => {
  const dropboxSignApiKey = dropboxSignApiKeyParam.value();
  const apiCaller = new EmbeddedApi();
  apiCaller.username = dropboxSignApiKey;
  try {
    const response = await apiCaller.embeddedSignUrl(signatureId);
    // The URL is in response.body.embedded.signUrl
    return response.body.embedded.signUrl;
  } catch (error) {
    functions.logger.error('Error fetching embedded sign URL', {
      signatureId,
      error,
    });
    throw error;
  }
};
