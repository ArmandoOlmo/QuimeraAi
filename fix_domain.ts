import * as admin from 'firebase-admin';
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

async function fix() {
  const domain = 'quimeraapp.com';
  const projectId = 'quimera'; // ID del proyecto Bike Shack (según la consola)
  const userId = 'ovoDLOjnnoa2P0zECMP4TNGKbC53';

  await db.collection('customDomains').doc(domain).set({
    domain,
    projectId,
    userId,
    status: 'active',
    sslStatus: 'active',
    dnsVerified: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✅ Vinculación forzada con éxito');
}
fix();
