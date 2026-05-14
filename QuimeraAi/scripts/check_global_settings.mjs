import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const docs = [
    'globalSettings/landingPage',
    'globalSettings/appInfo',
    'settings/languages'
  ];

  for (const path of docs) {
    const doc = await firestore.doc(path).get();
    if (doc.exists) {
      console.log(`\nPath: ${path}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    }
  }
}

main().catch(console.error);
