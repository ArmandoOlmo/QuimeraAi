const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "quimeraai",
});
const db = admin.firestore();

async function check() {
  const firebaseUID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';
  const snap = await db.collection(`users/${firebaseUID}/projects`).get();
  console.log(`Sixto Media projects in users/${firebaseUID}/projects:`, snap.size);

  const tenantId = 'tenant_JQCYR5RSx0UZo9atof9VbEWP0w83';
  const snap2 = await db.collection(`tenants/${tenantId}/projects`).get();
  console.log(`Sixto Media projects in tenants/${tenantId}/projects:`, snap2.size);
  process.exit(0);
}
check().catch(console.error);
