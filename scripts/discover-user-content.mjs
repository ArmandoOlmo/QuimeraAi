#!/usr/bin/env node
/**
 * Discover where the content of non-owner users lives in Firestore.
 * Checks tenants/{tenantId}/projects, project ownership in flat `projects` collection,
 * and any other location.
 */
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const requireFromFunctions = createRequire(resolve(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');

const FIREBASE_PROJECT_ID = 'quimeraai';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

async function main() {
  console.log('=== Top-level collections ===');
  const cols = await firestore.listCollections();
  for (const c of cols) {
    let count = 0;
    try {
      const snap = await c.limit(1000).get();
      count = snap.size;
    } catch (e) {}
    console.log(`  - ${c.id} (~${count} docs)`);
  }

  console.log('\n=== Tenants ===');
  const tenSnap = await firestore.collection('tenants').get();
  console.log(`Total tenants: ${tenSnap.size}\n`);

  for (const tenDoc of tenSnap.docs) {
    const t = tenDoc.data();
    console.log(`Tenant ${tenDoc.id} | ${t.name || ''} | ownerId: ${t.ownerId || t.owner_id || t.userId || 'N/A'}`);
    const subCols = await tenDoc.ref.listCollections();
    for (const sc of subCols) {
      const subSnap = await sc.limit(1).get();
      const sizeSnap = await sc.get();
      console.log(`   /${sc.id}: ${sizeSnap.size} docs`);
      if (sc.id === 'projects' || sc.id === 'members') {
        sizeSnap.docs.slice(0, 5).forEach(d => {
          const data = d.data();
          const name = data.name || data.email || data.userId || data.role || '(no name)';
          console.log(`     - ${d.id} (${typeof name === 'object' ? JSON.stringify(name) : name})`);
        });
      }
    }
  }

  console.log('\n=== Users subcollections ===');
  const usersSnap = await firestore.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const subs = await userDoc.ref.listCollections();
    if (subs.length === 0) continue;
    console.log(`\nUser ${userDoc.id} (${data.email || ''}) — role: ${data.role || ''}`);
    for (const sc of subs) {
      const ss = await sc.get();
      console.log(`   /${sc.id}: ${ss.size} docs`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
