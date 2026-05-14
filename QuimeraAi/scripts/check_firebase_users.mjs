import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

async function main() {
  const user = await admin.auth().getUserByEmail('sixtomedia@gmail.com');
  console.log("Firebase Auth UID for sixtomedia@gmail.com:", user.uid);
  
  const firestore = admin.firestore();
  const projects = await firestore.collection(`users/${user.uid}/projects`).get();
  console.log(`Found ${projects.size} projects in users/${user.uid}/projects`);
  
  if (projects.size > 0) {
    projects.forEach(doc => {
      console.log("-", doc.id);
    });
  }
}
main();
