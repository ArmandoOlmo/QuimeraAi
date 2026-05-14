const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "quimeraai",
});

const db = admin.firestore();

async function check() {
  const ids = ["JQCYR5RSx0UZo9atof9VbEWP0w83", "tenant_JQCYR5RSx0UZo9atof9VbEWP0w83", "sixtomedia@gmail.com"];
  for (const id of ids) {
    console.log("Checking tenant:", id);
    const snap = await db.collection('tenants').doc(id).get();
    if (snap.exists) {
      console.log("FOUND:", JSON.stringify(snap.data(), null, 2));
    }
  }
  
  // also try to find by email or ownerUserId
  console.log("Searching tenants by ownerUserId or email...");
  const snap1 = await db.collection('tenants').where('ownerUserId', '==', 'JQCYR5RSx0UZo9atof9VbEWP0w83').get();
  snap1.forEach(doc => console.log("By ownerUserId:", doc.id, JSON.stringify(doc.data(), null, 2)));

  const snap2 = await db.collection('users').doc('JQCYR5RSx0UZo9atof9VbEWP0w83').get();
  if (snap2.exists) {
     console.log("User doc:", JSON.stringify(snap2.data(), null, 2));
  }
  
  console.log("Done");
  process.exit(0);
}

check().catch(console.error);
