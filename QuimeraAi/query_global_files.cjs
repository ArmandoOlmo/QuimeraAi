const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('global_files').get();
  console.log(`Total global_files: ${snapshot.size}`);

  const adminAssetsSnap = await db.collection('adminAssets').get();
  console.log(`Total adminAssets: ${adminAssetsSnap.size}`);

  process.exit(0);
}
check();
