#!/usr/bin/env node
/**
 * Deep comparison of sixtomedia@gmail.com content between Firebase and Supabase.
 *
 * Goals:
 *   1. Identify which Supabase projects map to which Firebase projects.
 *   2. Detect content fields present in Firebase but missing/empty in Supabase.
 *   3. Count Firebase Storage URLs per project (we will strip them later).
 *   4. List subcollections (files, stores, etc.) and their presence in Supabase.
 *
 * Read-only. Does NOT modify anything.
 */
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const requireFromFunctions = createRequire(resolve(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');
const requireFromQuimera = createRequire(resolve(ROOT, 'QuimeraAi', 'package.json'));
const { createClient } = requireFromQuimera('@supabase/supabase-js');

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SIXTO_FB_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';
const SIXTO_SB_ID = '26d2676a-4a96-40cd-ae0a-9e6a863fa601';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v);
  return out;
}

function countFirebaseUrls(obj, c = { count: 0 }) {
  if (obj === null || obj === undefined) return c;
  if (typeof obj === 'string') {
    if (
      obj.includes('firebasestorage.googleapis.com') ||
      obj.includes('firebasestorage.app/') ||
      obj.includes('storage.googleapis.com/quimeraai')
    ) {
      c.count++;
    }
    return c;
  }
  if (typeof obj !== 'object') return c;
  if (Array.isArray(obj)) {
    obj.forEach((v) => countFirebaseUrls(v, c));
    return c;
  }
  Object.values(obj).forEach((v) => countFirebaseUrls(v, c));
  return c;
}

function getTopLevelKeys(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).sort();
}

function getNestedSize(obj) {
  try {
    return JSON.stringify(obj || {}).length;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('============================================================');
  console.log('  SIXTOMEDIA DEEP COMPARE');
  console.log('============================================================');

  // -------- Firebase projects --------
  const fbProjectsSnap = await firestore
    .collection(`users/${SIXTO_FB_UID}/projects`)
    .get();
  console.log(`\n[Firebase] users/${SIXTO_FB_UID}/projects: ${fbProjectsSnap.size} projects`);

  const fbProjects = [];
  for (const doc of fbProjectsSnap.docs) {
    const data = sanitize(doc.data());
    const urls = countFirebaseUrls(data).count;
    const sizeBytes = getNestedSize(data);
    const subs = await doc.ref.listCollections();
    const subInfo = [];
    for (const sc of subs) {
      const subSnap = await sc.get();
      subInfo.push({ name: sc.id, count: subSnap.size });
    }
    fbProjects.push({
      id: doc.id,
      name: data.name,
      keys: getTopLevelKeys(data),
      sizeBytes,
      firebaseUrls: urls,
      subcollections: subInfo,
    });
  }

  fbProjects.forEach((p) => {
    console.log(`\n  Firebase project: ${p.id}`);
    console.log(`    name:        ${typeof p.name === 'object' ? JSON.stringify(p.name) : p.name}`);
    console.log(`    sizeBytes:   ${p.sizeBytes}`);
    console.log(`    firebaseUrls: ${p.firebaseUrls}`);
    console.log(`    topKeys (${p.keys.length}): ${p.keys.join(', ')}`);
    if (p.subcollections.length) {
      console.log(`    subcollections:`);
      p.subcollections.forEach((s) => console.log(`      /${s.name}: ${s.count} docs`));
    }
  });

  // -------- Supabase projects --------
  const { data: sbProjects, error } = await supabase
    .from('projects')
    .select('id, name, data, created_at')
    .eq('user_id', SIXTO_SB_ID);
  if (error) throw error;

  console.log(`\n[Supabase] projects for ${SIXTO_SB_ID}: ${sbProjects.length}`);

  sbProjects.forEach((p) => {
    const urls = countFirebaseUrls(p.data || {}).count;
    const keys = getTopLevelKeys(p.data || {});
    console.log(`\n  Supabase project: ${p.id}`);
    console.log(`    name:        ${p.name}`);
    console.log(`    created_at:  ${p.created_at}`);
    console.log(`    sizeBytes:   ${getNestedSize(p.data)}`);
    console.log(`    firebaseUrls: ${urls}`);
    console.log(`    deleted?:     ${!!(p.data?.deletedAt || p.data?.isDeleted)}`);
    console.log(`    legacyId:    ${p.data?.legacyId || p.data?.id || '(none)'}`);
    console.log(`    topKeys (${keys.length}): ${keys.join(', ')}`);
  });

  // -------- Mapping inference --------
  console.log('\n============================================================');
  console.log('  Mapping inference: Firebase → Supabase');
  console.log('============================================================');

  for (const fb of fbProjects) {
    const matches = sbProjects.filter((sb) => {
      const legacyId = sb.data?.legacyId || sb.data?.id;
      return legacyId === fb.id;
    });
    const fbNameEs = typeof fb.name === 'object' ? fb.name.es || fb.name.en : fb.name;
    console.log(`\nFirebase ${fb.id} ("${fbNameEs}")`);
    if (matches.length === 0) {
      console.log(`  → NO direct match by legacyId`);
      const fuzzy = sbProjects.filter((sb) => {
        const sbName = (sb.name || '').toLowerCase();
        const fbNameLower = (fbNameEs || '').toLowerCase();
        return sbName.includes(fbNameLower) || fbNameLower.includes(sbName);
      });
      fuzzy.forEach((sb) => console.log(`  → fuzzy name match: ${sb.id} (${sb.name})`));
    } else {
      matches.forEach((sb) => console.log(`  → matched ${sb.id} (${sb.name})`));
    }
  }

  // -------- Subcollections summary --------
  console.log('\n============================================================');
  console.log('  Other Firestore data of sixtomedia');
  console.log('============================================================');

  const userSubs = await firestore.collection(`users/${SIXTO_FB_UID}`).listCollections().catch(() => []);
  // Note: listCollections on a doc requires the doc reference
  const userDocRef = firestore.doc(`users/${SIXTO_FB_UID}`);
  const allSubs = await userDocRef.listCollections();
  for (const sc of allSubs) {
    const snap = await sc.get();
    console.log(`  users/${SIXTO_FB_UID}/${sc.id}: ${snap.size} docs`);
  }

  // Tenant if any
  const tenantId = `tenant_${SIXTO_FB_UID}`;
  const tenantRef = firestore.doc(`tenants/${tenantId}`);
  const tenantDoc = await tenantRef.get();
  if (tenantDoc.exists) {
    console.log(`\n  Tenant ${tenantId} exists`);
    const tenantSubs = await tenantRef.listCollections();
    for (const sc of tenantSubs) {
      const snap = await sc.get();
      console.log(`    tenants/${tenantId}/${sc.id}: ${snap.size} docs`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
