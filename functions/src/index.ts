import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

admin.initializeApp();

import {
  createDropboxSignSignatureRequest,
  getDropboxSignSignatureRequest,
  getEmbeddedSignUrl,
} from './services/dropbox-sign';
import { ContractSchema } from '@shared/types/access-control';
import type { Contract } from '@shared/types/access-control';

// Backend version of interpolateWithDefaults function
function interpolateWithDefaults(
  text: string,
  data: Record<string, string | number>
): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/\{\{(.+?)\}\}/g, (_match, captured) => {
    const parts = captured.split('||');
    const fieldName = parts[0].trim();
    const defaultValue = parts.length > 1 ? parts[1].trim() : `[${fieldName}]`;

    const valueFromData = data[fieldName];

    if (
      valueFromData !== undefined &&
      valueFromData !== null &&
      valueFromData !== ''
    ) {
      return String(valueFromData);
    }
    return defaultValue;
  });
}

// Function to generate contract HTML from template and data
function generateContractHTML(
  template: { baseClauses?: string[] },
  contractData: { formData: Record<string, string | number> },
  contractTitle: string
): string {
  const interpolatedClauses =
    template.baseClauses?.map((clause: string) =>
      interpolateWithDefaults(clause, contractData.formData)
    ) || [];

  // Extract signer names for cleaner template
  const signer1Name =
    contractData.formData.party1Name || contractData.formData.signer1Name;
  const signer2Name =
    contractData.formData.party2Name || contractData.formData.signer2Name;

  // Generate HTML with proper structure for Dropbox Sign
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contractTitle}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.6;
            margin: 40px;
            color: #333;
        }
        .contract-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .clause {
            margin-bottom: 15px;
            text-align: justify;
        }
        .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        .signature-box {
            width: 200px;
            margin: 20px;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            height: 40px;
            margin-bottom: 10px;
        }
        .signer-info {
            font-size: 14px;
            margin-bottom: 5px;
        }
        /* Dropbox Sign text tags for signature fields */
        .text-tag {
            display: inline-block;
            background-color: #ffffcc;
            border: 1px dashed #333;
            padding: 5px;
            margin: 2px;
        }
    </style>
</head>
<body>
    <div class="contract-title">${contractTitle}</div>

    ${interpolatedClauses
      .map((clause: string) => `<div class="clause">${clause}</div>`)
      .join('')}

    <div class="signature-section">
        ${
          signer1Name
            ? `
        <div class="signature-box">
            <div class="signer-info">חתימת ${signer1Name}:</div>
            <div class="signature-line">
                <span class="text-tag" data-signer="0">{{signature_1}}</span>
            </div>
            <div class="signer-info">תאריך: <span class="text-tag" data-signer="0">{{date_1}}</span></div>
        </div>
        `
            : ''
        }

        ${
          signer2Name
            ? `
        <div class="signature-box">
            <div class="signer-info">חתימת ${signer2Name}:</div>
            <div class="signature-line">
                <span class="text-tag" data-signer="1">{{signature_2}}</span>
            </div>
            <div class="signer-info">תאריך: <span class="text-tag" data-signer="1">{{date_2}}</span></div>
        </div>
        `
            : ''
        }
    </div>
</body>
</html>`;

  return html;
}

// Function to extract signers from contract data
function extractSigners(contractData: {
  formData: Record<string, string | number>;
}): Array<{
  name: string;
  email: string;
  order: number;
}> {
  const signers = [];

  functions.logger.info('Extracting signers from formData', {
    formDataKeys: Object.keys(contractData.formData),
    formData: contractData.formData,
  });

  // Check for party1/party2 naming convention (templates)
  if (contractData.formData.party1Name && contractData.formData.party1Email) {
    signers.push({
      name: String(contractData.formData.party1Name),
      email: String(contractData.formData.party1Email),
      order: 0,
    });
    functions.logger.info('Added party1 signer', {
      name: contractData.formData.party1Name,
      email: contractData.formData.party1Email,
    });
  }

  if (contractData.formData.party2Name && contractData.formData.party2Email) {
    signers.push({
      name: String(contractData.formData.party2Name),
      email: String(contractData.formData.party2Email),
      order: 1,
    });
    functions.logger.info('Added party2 signer', {
      name: contractData.formData.party2Name,
      email: contractData.formData.party2Email,
    });
  }

  // Check for signer1/signer2 naming convention (contract creation form)
  if (contractData.formData.signer1Name && contractData.formData.signer1Email) {
    signers.push({
      name: String(contractData.formData.signer1Name),
      email: String(contractData.formData.signer1Email),
      order: 0,
    });
    functions.logger.info('Added signer1', {
      name: contractData.formData.signer1Name,
      email: contractData.formData.signer1Email,
    });
  }

  if (contractData.formData.signer2Name && contractData.formData.signer2Email) {
    signers.push({
      name: String(contractData.formData.signer2Name),
      email: String(contractData.formData.signer2Email),
      order: signers.length, // Use length to avoid duplicate order 0
    });
    functions.logger.info('Added signer2', {
      name: contractData.formData.signer2Name,
      email: contractData.formData.signer2Email,
    });
  }

  functions.logger.info('Total signers extracted', {
    count: signers.length,
    signers: signers,
  });

  return signers;
}

// Default templates fallback (copied from frontend templateServices)
const defaultTemplates = [
  {
    id: 'lease-residential',
    title: 'הסכם שכירות דירה',
    category: 'נדל"ן',
    description: 'חוזה סטנדרטי למשכירים ושוכרים למגורים.',
    baseClauses: [
      'שנערך ונחתם ב{{city||תל אביב}} ביום {{day}} לחודש {{month}} שנת {{year}}',
      'בין: {{party1Name}} (ת.ז. __________) מצד אחד',
      'לבין: {{party2Name}} (ת.ז. __________) מצד שני',
      'הואיל והמשכיר הינו בעל הזכויות בנכס הנמצא בכתובת: {{address}} (להלן: "המושכר").',
      'והואיל והשוכר מעוניין לשכור מאת המשכיר את המושכר לתקופה ובתנאים המפורטים להלן.',
      'והואיל והצדדים מסכימים כי דמי השכירות החודשיים יעמדו על סך {{rentAmount}} ש"ח.',
      'והואיל ותקופת השכירות תחל ביום {{startDate}}.',
    ],
  },
  {
    id: 'service-freelance',
    title: 'הסכם שירותי פרילנס',
    category: 'שירותים',
    description: 'חוזה לפרילנסרים המספקים שירותים ללקוחות.',
    baseClauses: [
      'שנערך ונחתם ביום {{day}} לחודש {{month}} שנת {{year}}',
      'בין: {{party1Name}} (להלן: "נותן השירותים")',
      'לבין: {{party2Name}} (להלן: "מקבל השירותים")',
      'הואיל ונותן השירותים עוסק במתן שירותי {{serviceDescription}}.',
      'והואיל ומקבל השירותים מעוניין לקבל מנותן השירותים את השירותים כאמור.',
      'הצדדים הסכימו כי התמורה עבור השירותים תעמוד על {{serviceFee}} ש"ח.',
    ],
  },
  {
    id: 'nda',
    title: 'הסכם סודיות (NDA)',
    category: 'עסקי',
    description: 'הסכם לשמירה על מידע רגיש בין צדדים.',
    baseClauses: [
      'שנערך ונחתם ביום {{effectiveDate}}',
      'בין: {{disclosingParty}} (להלן: "הצד המגלה")',
      'לבין: {{receivingParty}} (להלן: "הצד המקבל")',
      'הואיל והצד המגלה מתכוון לגלות לצד המקבל מידע סודי (כהגדרתו להלן) למטרת {{purpose||בחינת שיתוף פעולה עסקי}}.',
    ],
  },
];

// Function to get default template by ID
function getDefaultTemplate(
  templateId: string
): { baseClauses?: string[] } | null {
  const template = defaultTemplates.find(t => t.id === templateId);
  return template || null;
}

export const prepareContractForSigning = onCall(async (data, _context) => {
  // For v2 onCall, input data is in data.data
  const contractId = data?.data?.contractId;
  if (!contractId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing contractId.'
    );
  }
  functions.logger.info('contractId', {
    contractId,
  });

  try {
    const db = admin.firestore();

    // Fetch contract data from Firestore
    const contractSnap = await db.collection('contracts').doc(contractId).get();
    if (!contractSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Contract not found');
    }
    const contractData = contractSnap.data();
    if (!contractData) {
      throw new functions.https.HttpsError(
        'internal',
        'Contract data is missing'
      );
    }

    functions.logger.info('Contract data found', {
      templateId: contractData.templateId,
      title: contractData.title,
      hasFormData: !!contractData.formData,
      formDataKeys: contractData.formData
        ? Object.keys(contractData.formData)
        : [],
    });

    // Fetch template data from Firestore with fallback to default templates
    const templateSnap = await db
      .collection('templates')
      .doc(contractData.templateId)
      .get();

    let template;
    if (!templateSnap.exists) {
      // Fallback to default templates if not found in Firestore
      functions.logger.warn(
        `Template ${contractData.templateId} not found in Firestore, using fallback`
      );
      template = getDefaultTemplate(contractData.templateId);
      if (!template) {
        throw new functions.https.HttpsError(
          'not-found',
          `Template not found: ${contractData.templateId}`
        );
      }
      functions.logger.info('Using default template', {
        templateId: contractData.templateId,
        hasBaseClauses: !!template.baseClauses,
        baseClausesCount: template.baseClauses?.length || 0,
      });
    } else {
      template = templateSnap.data();
      if (!template) {
        throw new functions.https.HttpsError(
          'internal',
          'Template data is missing'
        );
      }
      functions.logger.info('Using Firestore template', {
        templateId: contractData.templateId,
        hasBaseClauses: !!template.baseClauses,
        baseClausesCount: template.baseClauses?.length || 0,
      });
    }

    // Generate contract HTML using real data
    const contractTitle = contractData.title || 'חוזה';

    // Validate that contractData has formData
    if (!contractData.formData || typeof contractData.formData !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Contract data is missing formData'
      );
    }

    const contractHtml = generateContractHTML(
      template as { baseClauses?: string[] },
      contractData as { formData: Record<string, string | number> },
      contractTitle
    );

    // Extract signers from contract data
    const signers = extractSigners(
      contractData as { formData: Record<string, string | number> }
    );

    if (signers.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No valid signers found in contract data'
      );
    }

    // Create Dropbox Sign signature request with real data
    const dropboxSignSignatureRequestId =
      await createDropboxSignSignatureRequest({
        contractTitle,
        contractHtml,
        signers,
      });

    functions.logger.info(
      'Result from createDropboxSignSignatureRequest (real contract)',
      {
        dropboxSignSignatureRequestId,
        contractTitle,
        signersCount: signers.length,
      }
    );

    if (!dropboxSignSignatureRequestId) {
      throw new functions.https.HttpsError(
        'internal',
        'Dropbox Sign did not return a signatureRequestId.'
      );
    }

    // Update contract in Firestore
    const updateData: Partial<Contract> = {
      status: 'out-for-signature',
      dropboxSignSignatureRequestId,
      lastUpdatedAt: FieldValue.serverTimestamp(),
    };
    await db
      .collection('contracts')
      .doc(contractId)
      .update(ContractSchema.partial().parse(updateData));

    functions.logger.info(
      'Contract updated with Dropbox Sign signatureRequestId',
      {
        contractId,
        dropboxSignSignatureRequestId,
      }
    );
    return { success: true };
  } catch (err) {
    functions.logger.error('Error in prepareContractForSigning:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new functions.https.HttpsError(
      'internal',
      `Failed to prepare contract for signing: ${errorMessage}`
    );
  }
});

export const getContractDropboxSignData = onCall(async (data, _context) => {
  try {
    const contractId = data?.data;
    if (!contractId || typeof contractId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing or invalid contractId'
      );
    }
    const db = admin.firestore();
    const contractSnap = await db.collection('contracts').doc(contractId).get();
    if (!contractSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Contract not found');
    }
    const contract = contractSnap.data();
    const dropboxSignSignatureRequestId =
      contract?.dropboxSignSignatureRequestId;
    if (!dropboxSignSignatureRequestId) {
      throw new functions.https.HttpsError(
        'not-found',
        'No Dropbox Sign signature request ID for this contract'
      );
    }
    const signatureRequestGetResponse = await getDropboxSignSignatureRequest(
      dropboxSignSignatureRequestId
    );
    return signatureRequestGetResponse;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : error;
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch Dropbox Sign data',
      errorMsg
    );
  }
});

export const getEmbeddedSignUrlForSigner = onCall(async (data, _context) => {
  const signatureId = data?.data?.signatureId;
  if (!signatureId || typeof signatureId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing or invalid signatureId.'
    );
  }
  try {
    const signUrl = await getEmbeddedSignUrl(signatureId);
    return { signUrl };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : error;
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch embedded sign URL',
      errorMsg
    );
  }
});

// Export admin role management functions
export {
  setAdminRole,
  getAllUsersWithRoles,
  initializeFirstAdmin,
} from './admin-roles';

// Export admin template management functions
export {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplatesForAdmin,
  syncDefaultTemplates,
} from './admin-templates';

// Export admin user management functions
export {
  setAdminStatus,
  getUserDetails,
  listUsers,
  makeInitialAdmin,
} from './admin-users';
