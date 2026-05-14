import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';
const FIREBASE_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const doc = await firestore.doc(`users/${FIREBASE_UID}/projects/proj_1770495785601`).get();
  console.log(Object.keys(doc.data()));
  console.log("Name:", doc.data().name);
}
main();
