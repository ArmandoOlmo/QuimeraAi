import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const paths = [
    'appContent/data/navigation',
    'appContent/data/landing',
    'appContent/data/legal'
  ];

  for (const path of paths) {
    const col = firestore.collection(path);
    const snapshot = await col.get();
    console.log(`\nPath: ${path} (${snapshot.size} items)`);
    snapshot.forEach(doc => {
      console.log(`- ID: ${doc.id}`);
      // console.log(JSON.stringify(doc.data(), null, 2));
    });
  }
  
  // Also check if they are documents instead of collections
  const docs = [
    'appContent/navigation',
    'appContent/landing',
    'appContent/legal',
    'appContent/data'
  ];
  
  for (const path of docs) {
    const doc = await firestore.doc(path).get();
    if (doc.exists) {
      console.log(`\nDoc: ${path} exists`);
      console.log(Object.keys(doc.data()));
    }
  }
}

main().catch(console.error);
