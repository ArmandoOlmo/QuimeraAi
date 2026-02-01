const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function run() {
  const userId = 'ovoDLOjnnoa7P0zECMP4TNGKbC53';
  const snap = await db.collection('users').doc(userId).collection('domains').get();
  console.log('--- DOMAINS ---');
  snap.forEach(doc => console.log(doc.id, doc.data()));
  const projects = await db.collection('users').doc(userId).collection('projects').get();
  console.log('--- PROJECTS ---');
  projects.forEach(doc => console.log(doc.id, doc.data().name));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
