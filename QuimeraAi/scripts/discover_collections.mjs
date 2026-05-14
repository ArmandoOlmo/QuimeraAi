import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  console.log("Checking Firestore root collections...");
  const collections = await firestore.listCollections();
  console.log("Root collections found:");
  collections.forEach(col => {
    console.log(`- ${col.id}`);
  });

  // Check appContent subcollections if it exists
  const appContentDoc = firestore.doc('appContent/data');
  const appContentCollections = await appContentDoc.listCollections();
  if (appContentCollections.length > 0) {
    console.log("\nSubcollections of appContent/data:");
    for (const col of appContentCollections) {
      const snapshot = await col.limit(1).get();
      console.log(`  - ${col.id} (${snapshot.size} items)`);
    }
  }

  // Check news collection
  const newsCollection = firestore.collection('news');
  const newsSnapshot = await newsCollection.limit(1).get();
  console.log(`\nNews collection: ${newsSnapshot.size} items`);

}

main().catch(console.error);
