import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const doc = await firestore.doc('appContent/data').get();
  console.log("appContent/data exists:", doc.exists);
  if (doc.exists) {
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
  } else {
    // Try listing subcollections of appContent/data even if doc doesn't exist
    const subcollections = await firestore.doc('appContent/data').listCollections();
    console.log("Subcollections of appContent/data:");
    subcollections.forEach(col => console.log(`- ${col.id}`));
  }
}

main().catch(console.error);
