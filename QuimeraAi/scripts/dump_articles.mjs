import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const articlesCol = firestore.collection('appContent/data/articles');
  const snapshot = await articlesCol.limit(5).get();
  
  if (snapshot.empty) {
    console.log('No articles found in appContent/data/articles');
    return;
  }

  console.log(`Found ${snapshot.size} articles in appContent/data/articles:`);
  snapshot.forEach(doc => {
    console.log(`\nID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });

  // Also check root news collection
  const newsCol = firestore.collection('news');
  const newsSnapshot = await newsCol.limit(5).get();
  console.log(`\nFound ${newsSnapshot.size} news items in /news:`);
  newsSnapshot.forEach(doc => {
    console.log(`\nID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

main().catch(console.error);
