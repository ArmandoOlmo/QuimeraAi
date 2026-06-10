const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'quimeraai' });
const db = admin.firestore();
async function run() {
  const snapshot = await db.collection('publicStores').limit(1).get();
  if (!snapshot.empty) {
    console.log("Found project:", snapshot.docs[0].id);
  } else {
    console.log("No public stores found.");
  }
}
run();
