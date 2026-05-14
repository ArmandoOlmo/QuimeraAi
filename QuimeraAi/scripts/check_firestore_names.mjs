import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';
const FIREBASE_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const projects = await firestore.collection(`users/${FIREBASE_UID}/projects`).get();
  projects.forEach(doc => {
    console.log(`- ${doc.id}: ${doc.data().name}`);
  });
}
main();
