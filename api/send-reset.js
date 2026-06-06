import admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters in the private key correctly
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// Helper to attach CORS headers to the response
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allows any origin (like localhost:8081)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req, res) {
  // 1. Always attach CORS headers to the response
  setCorsHeaders(res);

  // 2. INSTANTLY catch the "Preflight" test ping and return a success!
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Ensure the actual request is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate the standard Firebase link
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);
    
    // Parse the URL to extract the secret 'oobCode'
    const urlObj = new URL(firebaseLink);
    const oobCode = urlObj.searchParams.get('oobCode');

    // Build your direct, custom URL pointing straight to your React app
    const customLink = `https://vnlbrew.shop/reset-password?oobCode=${oobCode}`;
    
    // Return the custom link to the frontend so EmailJS can use it
    return res.status(200).json({ link: customLink });

  } catch (error) {
    console.error('Admin Auth Error:', error);
    return res.status(500).json({ error: error.message });
  }
}