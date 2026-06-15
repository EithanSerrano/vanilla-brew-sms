// One-time script to create the initial admin account.
// Run from inside vnl-brw-SE: node create-admin.mjs
// Delete this file after use.

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('C:/Users/Ron/Downloads/vnlbrewsystem-firebase-adminsdk-fbsvc-eb2aee74bf.json');

// ── Set your admin credentials here ──────────────────────────────────────────
const ADMIN_EMAIL        = 'vnlbrew0719@gmail.com';
const ADMIN_PASSWORD     = 'ADMINACCOUNTACCESS';            
const ADMIN_FULL_NAME    = 'Administrator';            // change this
const ADMIN_DISPLAY_NAME = 'Admin';                    // change this
// ─────────────────────────────────────────────────────────────────────────────

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db   = admin.firestore();
const auth = admin.auth();

async function createAdmin() {
  console.log(`Creating auth user: ${ADMIN_EMAIL}`);
  const userRecord = await auth.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_DISPLAY_NAME,
  });
  console.log('Auth user created, UID:', userRecord.uid);

  const usersSnap = await db.collection('users').get();
  const empId = `EMP${String(usersSnap.size + 1).padStart(3, '0')}`;

  await db.collection('users').doc(userRecord.uid).set({
    empId,
    fullName: ADMIN_FULL_NAME,
    name: ADMIN_DISPLAY_NAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    status: 'Active',
    isOnline: false,
    mustChangePassword: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\nAdmin account created!`);
  console.log(`  empId: ${empId}`);
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Pass:  ${ADMIN_PASSWORD}`);
  console.log(`\nLog in now, then delete this file.`);
}

createAdmin().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
