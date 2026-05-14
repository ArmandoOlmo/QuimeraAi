import admin from 'firebase-admin';

const FIREBASE_PROJECT_ID = 'quimeraai';
const FIREBASE_TENANT_ID = 'tenant_JQCYR5RSx0UZo9atof9VbEWP0w83';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const firestore = admin.firestore();

async function main() {
  const projects = await firestore.collection(`tenants/${FIREBASE_TENANT_ID}/projects`).get();
  console.log(`Found ${projects.size} projects in tenants/${FIREBASE_TENANT_ID}/projects`);
  
  if (projects.size > 0) {
    projects.forEach(doc => {
      console.log("-", doc.id);
    });
  }
}
main();
