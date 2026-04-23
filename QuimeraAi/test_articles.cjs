const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('app_blog_posts').limit(5).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Blog ${doc.id}: Featured Image length: ${data.featuredImage?.length || 0}`);
    if (data.featuredImage && data.featuredImage.startsWith('data:image')) {
       console.log('   -> It is a base64 string!');
    }
    if (data.content && data.content.includes('data:image')) {
       console.log('   -> Content contains base64 image!');
    }
  });

  const newsSnap = await db.collection('app_news').limit(5).get();
  newsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`News ${doc.id}: Featured Image length: ${data.featuredImage?.length || 0}`);
    if (data.featuredImage && data.featuredImage.startsWith('data:image')) {
       console.log('   -> It is a base64 string!');
    }
  });
  process.exit(0);
}
check();
