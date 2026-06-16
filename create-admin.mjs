import admin from 'firebase-admin';

const serviceAccount = {
  type: "service_account",
  project_id: "vnlbrewsystem",
  private_key_id: "eb2aee74bf3f2f4128a0f4f5af2a867c74447b3b",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBfgsXVEUcqUHW\nQA3e6lAJJ7SrwUn8i9XmZd+suWxlS5tv2B/zFYB+LHc5i4cIHczjuatARGZGRBro\nt/web9vQerdnfgsk8sJJXAQLz0RbfrzW+wk8AIwsah3E7L4dH6IgE4YHWQTWOkSD\nHxDUyubQaYbXqsFf2j6k8FkJTC5phpis1IFqSb0yTnlJg0TfDtem8vZp3ulzDsvI\n9GeLnPz8Cd3r9tMruwvxZVdQ6mSc6m6Yl9LhuuOVKDA/C3vhIbPSDGJw9N4GZzr0\niuzNH0qUGtxX2ElNL5MyPdkwa30Ccy7CiYViE8PGwKgw0+qkscITPC881QmxX5t1\nU3ehLeddAgMBAAECggEAAWe01RRJqoczIRxsIrKGZsPzogIAaMsA1bsR0wCyCrvw\nEsbvF8uP7Y/371fLS6c1v0XwT6zqJjf6jwvo/YqX6M1qAAslsby+kEb7XjTrh5OQ\nc6o1MLWbTvuX9ZUM3gwbrV/JlnY9HKt7Jw2byG55xcktD2tgG0ir3EmaMpZWSZy1\n9CQc6hax8t39V4lqXRf8eWtc1Sz4Aeg/JVZshIGH5ZXKcDKDZg99jPGjfvmWZ2S7\n2XUhMcdIQstuGtLgGiL4WyegnuIj34E4hixZwIxogxLT0UCEnFtYG31qBCsVU2Jx\nK6xfoZJTYniQPOBYFkVLMfrMWSlZBzX/8Myn8V3SGQKBgQDtAWMaTE6ltUrxXyi3\ncIV45uVr4g2N64ZvGWYAI4I/pkoVuMcmwzg3pKJG14G89FNnJ3HLdUYJoHOJY9OT\nr9bX3Plxil5nCtoGUN/TNnt+qDLkQvZQG22aAeGu/Aodw4Qpb128QxRbcm54KZDH\nnlRDJT2MloooBvvQH/GNnot+uQKBgQDQ/+daufXfMtDD7Eb460cgOWTzRI0rLy3J\nEvE7pkvrwcScUmk5E6A4V2saizRdFCSAxagIGcPynQ7lNPhiSp/8v1Y1+LELAlCK\ncrJEc4tsc9CJ/ddVd+OznnDICWI6GkGx15AIFgLLArii/nooYxWRnAMH+jxBhC7o\ncZ2U1Eb7xQKBgQDiO3a7/ab9KqbU7H7TS8c8dzr71hYWKIJ0vovNChgkZblGLtF7\nQNIC21ZDxScElTyftNk82z71pYFj3jRyP2EXQMmjBe/C8GrZqI1e8hzD9A5QMVMp\neGUQo0coX1HQw3b+jl2tfWKLQBoO/a5DvfC0/3FXJ8PNHY11R2iuRG7nkQKBgEQ5\nFLtf8quuOcmKykwc+TXCpnpmiTJsjySQ42AWU7gco2Jn4GM6TdW2a4bZo/kyRwwl\n+UjTqEv9Csy1MtNbCsiFaM3rZVdzpPjcoeaIVR3M3Gj/DJigrxqGAMi7j23p/kHg\nXOrWzIiaVc0XBqdCWNsUM0UaYSr9zBYiaE8Z0CYFAoGBALpPn3SegK8nz7j6rcBw\nsNJm27xRSADkcpq+zPjwb+FR21wXY0l1d4/lAYW0qqTyknsDBWEQ0g5geQqVrZhG\nqctSOyzxCvUYlkTVDiVjOU4ACYZCrcSUE6ka2HOclEP+VxkY16vVPZxHdeEbQUso\nTKsIh5a5mUFa1loVnmGcyfw9\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@vnlbrewsystem.iam.gserviceaccount.com",
  client_id: "114279391264921489374",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
};

// ── Set your admin credentials here ──────────────────────────────────────────
const ADMIN_EMAIL        = 'vnlbrew0719@gmail.com';
const ADMIN_PASSWORD     = 'VNLBREWADMIN';
const ADMIN_FULL_NAME    = 'Administrator';
const ADMIN_DISPLAY_NAME = 'Admin';
// ─────────────────────────────────────────────────────────────────────────────

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db   = admin.firestore();
const auth = admin.auth();

async function deleteAllAuthUsers() {
  let pageToken;
  let total = 0;
  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.length) {
      await auth.deleteUsers(result.users.map(u => u.uid));
      total += result.users.length;
    }
    pageToken = result.pageToken;
  } while (pageToken);
  console.log(`Deleted ${total} Auth user(s).`);
}

async function deleteAllFirestoreUsers() {
  const snap = await db.collection('users').get();
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
  console.log(`Deleted ${snap.size} Firestore user document(s).`);
}

async function resetAndCreateAdmin() {
  await deleteAllAuthUsers();
  await deleteAllFirestoreUsers();

  console.log(`Creating auth user: ${ADMIN_EMAIL}`);
  const userRecord = await auth.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_DISPLAY_NAME,
  });
  console.log('Auth user created, UID:', userRecord.uid);

  await db.collection('users').doc(userRecord.uid).set({
    empId: 'EMP001',
    fullName: ADMIN_FULL_NAME,
    name: ADMIN_DISPLAY_NAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    status: 'Active',
    isOnline: false,
    mustChangePassword: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\nReset complete. Admin account created!`);
  console.log(`  empId: EMP001`);
  console.log(`  Email: ${ADMIN_EMAIL}`);
  console.log(`  Pass:  ${ADMIN_PASSWORD}`);
  console.log(`\nLog in now, then delete this file.`);
}

resetAndCreateAdmin().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
