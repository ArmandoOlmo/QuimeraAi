#!/usr/bin/env node
/**
 * ============================================================
 * AUDIT: Firebase vs Supabase content
 * ============================================================
 *
 * Compares every Firestore user's `users/{uid}/projects` subcollection
 * against Supabase `projects` rows to identify users whose content was
 * NOT migrated.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="..." node scripts/audit-firebase-vs-supabase.mjs
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
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
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

async function listAllSupabaseUsers() {
  let all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  return all;
}

async function main() {
  console.log('============================================================');
  console.log('  AUDIT: Firebase vs Supabase content per-user');
  console.log('============================================================\n');

  const sbAuthUsers = await listAllSupabaseUsers();
  const emailToSbId = new Map();
  sbAuthUsers.forEach((u) => {
    if (u.email) emailToSbId.set(u.email.toLowerCase(), u.id);
  });
  console.log(`Supabase auth users: ${sbAuthUsers.length}`);

  const { data: sbProjects, error: sbErr } = await supabase
    .from('projects')
    .select('id, name, user_id, data')
    .limit(5000);
  if (sbErr) throw sbErr;

  const sbProjectsByUser = new Map();
  for (const p of sbProjects) {
    if (!sbProjectsByUser.has(p.user_id)) sbProjectsByUser.set(p.user_id, []);
    sbProjectsByUser.get(p.user_id).push(p);
  }
  console.log(`Supabase total projects: ${sbProjects.length}\n`);

  const fbUsersSnap = await firestore.collection('users').get();
  console.log(`Firestore users: ${fbUsersSnap.size}\n`);

  const summary = [];

  for (const fbUserDoc of fbUsersSnap.docs) {
    const fbUid = fbUserDoc.id;
    const fbData = fbUserDoc.data();
    const email = (fbData.email || '').toLowerCase();
    const role = fbData.role || '';

    const fbProjectsSnap = await firestore
      .collection(`users/${fbUid}/projects`)
      .get();

    const supabaseId = emailToSbId.get(email);
    const sbProjs = supabaseId ? (sbProjectsByUser.get(supabaseId) || []) : [];

    summary.push({
      fbUid,
      email,
      role,
      fbProjectsCount: fbProjectsSnap.size,
      supabaseId: supabaseId || null,
      sbProjectsCount: sbProjs.length,
      missingCount: Math.max(0, fbProjectsSnap.size - sbProjs.length),
    });
  }

  console.table(summary);

  console.log('\n=== USERS WITH MISSING CONTENT ===');
  const missing = summary.filter((s) => s.fbProjectsCount > 0 && s.missingCount > 0);
  console.table(missing);

  console.log('\n=== USERS WITH NO Supabase account ===');
  const noSupabase = summary.filter((s) => !s.supabaseId);
  console.table(noSupabase);
}

main().catch((err) => {
  console.error('\n❌ Audit failed:', err);
  process.exit(1);
});
