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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // 1. Generate the standard Firebase link
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);
    
    // 2. Parse the URL to extract the secret 'oobCode'
    const urlObj = new URL(firebaseLink);
    const oobCode = urlObj.searchParams.get('oobCode');

    // 3. Build your direct, custom URL pointing straight to your React app
    const customLink = `https://vnlbrew.shop/reset-password?oobCode=${oobCode}`;
    
    // 4. Return the custom link to the frontend so EmailJS can use it
    res.status(200).json({ link: customLink });

  } catch (error) {
    console.error('Admin Auth Error:', error);
    res.status(500).json({ error: error.message });
  }
}