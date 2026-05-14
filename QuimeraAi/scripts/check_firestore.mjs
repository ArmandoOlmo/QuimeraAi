import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';
const FIREBASE_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const doc = await firestore.doc(`users/${FIREBASE_UID}/projects/dadcc9ab-5a62-41bc-8458-aec8ba60e420`).get();
  console.log("FIRESTORE DOC EXISTS:", doc.exists);
  if (doc.exists) {
    const data = doc.data();
    console.log("FIRESTORE DOC KEYS:");
    console.log(Object.keys(data));
  }
}
main();
