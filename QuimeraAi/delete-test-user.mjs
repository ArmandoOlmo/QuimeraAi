import admin from 'firebase-admin';
try {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const user = await admin.auth().getUserByEmail('test@quimera.ai');
  await admin.auth().deleteUser(user.uid);
  console.log('Deleted test user');
} catch (e) {
  console.error(e.message);
}
