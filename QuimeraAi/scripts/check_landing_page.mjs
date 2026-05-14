import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const doc = await firestore.doc('globalSettings/landingPage').get();
  if (doc.exists) {
    console.log(JSON.stringify(doc.data(), null, 2));
  }
}

main().catch(console.error);
