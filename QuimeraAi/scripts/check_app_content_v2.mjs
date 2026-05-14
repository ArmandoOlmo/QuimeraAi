import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  console.log("Listing docs in appContent collection:");
  const snapshot = await firestore.collection('appContent').get();
  snapshot.forEach(doc => {
    console.log(`- ${doc.id}`);
    console.log("  Fields:", Object.keys(doc.data()));
  });
  
  // Also check if news has items
  const newsSnapshot = await firestore.collection('news').get();
  console.log(`\nNews collection has ${newsSnapshot.size} items.`);
}

main().catch(console.error);
