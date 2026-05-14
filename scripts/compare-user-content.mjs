#!/usr/bin/env node
/**
 * Compare Firebase project content vs Supabase project content per user.
 * Specifically inspects non-owner users to find content that wasn't migrated.
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

const TARGETS = [
  { fbUid: 'JQCYR5RSx0UZo9atof9VbEWP0w83', email: 'sixtomedia@gmail.com', sbId: '26d2676a-4a96-40cd-ae0a-9e6a863fa601' },
  { fbUid: 'U6llm3oKqAbp8SJEi7oItHLW8nL2', email: 'belajarety@gmail.com', sbId: '7b35791e-23f7-4bbc-a76c-21e271079aef' },
  { fbUid: '9GqNKpG1IrgPDxKjcmc7P9rq6Bk2', email: 'luisgqf2195@gmail.com', sbId: '020318ac-d71b-416a-8c43-a292c5a1ff07' },
  { fbUid: 'iPUzXDgxdtbi9My2xd148yZkmx23', email: 'isla@jibarillo.com', sbId: '743bb7aa-6799-4e0a-87a2-f2f72f78953f' },
];

function describe(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return typeof obj;
  if (Array.isArray(obj)) return `Array(${obj.length})`;
  const keys = Object.keys(obj);
  return `{${keys.slice(0, 25).join(', ')}${keys.length > 25 ? `...+${keys.length - 25}` : ''}}`;
}

function countFirebaseUrls(obj, found = []) {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.includes('firebasestorage')) found.push(obj.slice(0, 100));
    return found;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v) => countFirebaseUrls(v, found));
    return found;
  }
  for (const k of Object.keys(obj)) countFirebaseUrls(obj[k], found);
  return found;
}

async function main() {
  for (const target of TARGETS) {
    console.log('\n============================================================');
    console.log(`USER: ${target.email}`);
    console.log(`  Firebase UID: ${target.fbUid}`);
    console.log(`  Supabase ID:  ${target.sbId}`);
    console.log('============================================================');

    const fbProjects = await firestore.collection(`users/${target.fbUid}/projects`).get();
    console.log(`\n  Firestore projects (users/{uid}/projects): ${fbProjects.size}`);
    fbProjects.docs.forEach((d) => {
      const data = d.data();
      const fbUrls = countFirebaseUrls(data);
      console.log(`    - ${d.id} | name="${typeof data.name === 'object' ? JSON.stringify(data.name) : data.name}" | shape=${describe(data)} | firebaseUrls=${fbUrls.length}`);
    });

    // Tenant projects
    const tenantId = `tenant_${target.fbUid}`;
    try {
      const tenProj = await firestore.collection(`tenants/${tenantId}/projects`).get();
      if (tenProj.size > 0) {
        console.log(`\n  Tenant projects (${tenantId}/projects): ${tenProj.size}`);
        tenProj.docs.forEach((d) => {
          const data = d.data();
          const fbUrls = countFirebaseUrls(data);
          console.log(`    - ${d.id} | name="${typeof data.name === 'object' ? JSON.stringify(data.name) : data.name}" | shape=${describe(data)} | firebaseUrls=${fbUrls.length}`);
        });
      }
    } catch (e) {}

    // Supabase projects
    const { data: sbProjects, error } = await supabase
      .from('projects')
      .select('id, name, data')
      .eq('user_id', target.sbId);
    console.log(`\n  Supabase projects: ${sbProjects?.length || 0}`);
    sbProjects?.forEach((p) => {
      const fbUrls = countFirebaseUrls(p.data || {});
      console.log(`    - ${p.id} | name="${p.name}" | shape=${describe(p.data)} | firebaseUrls=${fbUrls.length}`);
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
