import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  try {
    // Call the Firebase Function endpoint
    const response = await fetch(
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL + '/testDropboxSign',
      { method: 'POST' }
    );
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).send('Error calling Dropbox Sign cloud function');
  }
}
