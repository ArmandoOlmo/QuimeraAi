import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const collections = ['globalSettings', 'settings', 'changelog', 'news'];
  for (const colName of collections) {
    console.log(`\nListing items in ${colName}:`);
    const snapshot = await firestore.collection(colName).limit(10).get();
    snapshot.forEach(doc => {
      console.log(`- ${doc.id}`);
      // console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
}

main().catch(console.error);
