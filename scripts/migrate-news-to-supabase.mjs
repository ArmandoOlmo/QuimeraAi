#!/usr/bin/env node
/**
 * ============================================================
 * FIRESTORE NEWS → SUPABASE NEWS MIGRATION
 * ============================================================
 * 
 * Migrates the 'news' collection from Firebase Firestore to
 * the Supabase 'news' table.
 *
 * Uses firebase-admin from functions/node_modules via createRequire.
 * Uses native fetch for Supabase REST API (no @supabase/supabase-js needed).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-news-to-supabase.mjs
 *
 * Prerequisites:
 *   - gcloud auth application-default login
 *   - SUPABASE_SERVICE_ROLE_KEY env var
 */

import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load firebase-admin from functions/node_modules using createRequire
const requireFromFunctions = createRequire(resolve(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');

// ============================================================
// CONFIGURATION
// ============================================================

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OWNER_EMAIL = 'armandoolmomiranda@gmail.com';

let SUPABASE_OWNER_ID = null;

// ============================================================
// INIT FIREBASE ADMIN
// ============================================================

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}

const firestore = admin.firestore();

// ============================================================
// SUPABASE REST HELPERS (no SDK needed)
// ============================================================

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required.');
  console.error('   Find it at: Supabase Dashboard → Settings → API → service_role key');
  console.error('   Usage: SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-news-to-supabase.mjs');
  process.exit(1);
}

async function supabasePost(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${table} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function supabaseAuthListUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Auth API failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// ============================================================
// HELPERS
// ============================================================

function sanitizeData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  if (obj._path && obj._converter !== undefined) {
    return obj.path;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeData(value);
  }
  return result;
}

// ============================================================
// MIGRATION
// ============================================================

async function getSupabaseOwnerId() {
  console.log('\n🔍 Finding Supabase owner user...');
  try {
    const data = await supabaseAuthListUsers();
    const users = data.users || data;
    const owner = users.find(u => u.email === OWNER_EMAIL);
    if (owner) {
      console.log(`  ✅ Found owner: ${owner.email} → ${owner.id}`);
      return owner.id;
    }
    if (users.length > 0) {
      console.log(`  ⚠️  Owner not found, using first user: ${users[0].email} → ${users[0].id}`);
      return users[0].id;
    }
  } catch (err) {
    console.error('❌ Error listing Supabase users:', err.message);
  }
  return null;
}

async function migrateNews() {
  console.log('\n📋 Migrating news from Firestore → Supabase...');

  const snap = await firestore.collection('news').get();
  console.log(`  Found ${snap.size} news items in Firestore.`);

  if (snap.size === 0) {
    console.log('  ℹ️  No news items to migrate.');
    return;
  }

  let inserted = 0;

  for (const docSnap of snap.docs) {
    const raw = sanitizeData(docSnap.data());

    const row = {
      title: raw.title || 'Sin título',
      excerpt: raw.excerpt || '',
      body: raw.body || '',
      image_url: raw.imageUrl || raw.image_url || null,
      video_url: raw.videoUrl || raw.video_url || null,
      cta: raw.cta || null,
      category: raw.category || 'general',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      status: raw.status || 'draft',
      publish_at: raw.publishAt || raw.publish_at || null,
      expire_at: raw.expireAt || raw.expire_at || null,
      targeting: raw.targeting || { type: 'all' },
      featured: raw.featured === true,
      priority: typeof raw.priority === 'number' ? raw.priority : 0,
      views: typeof raw.views === 'number' ? raw.views : 0,
      clicks: typeof raw.clicks === 'number' ? raw.clicks : 0,
      created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
      updated_at: raw.updatedAt || raw.updated_at || new Date().toISOString(),
      created_by: SUPABASE_OWNER_ID,
      updated_by: SUPABASE_OWNER_ID,
      language: raw.language || 'es',
      translation_group: raw.translationGroup || raw.translation_group || null,
      translated_from: raw.translatedFrom || raw.translated_from || null,
      translation_status: raw.translationStatus || raw.translation_status || null,
    };

    try {
      const result = await supabasePost('news', row);
      inserted++;
      const newId = Array.isArray(result) ? result[0]?.id : result?.id;
      console.log(`  ✅ "${row.title}" → ${newId || 'OK'}`);
    } catch (err) {
      console.error(`  ❌ "${row.title}": ${err.message}`);
    }
  }

  console.log(`\n  📊 Migrated ${inserted}/${snap.size} news items`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('  FIRESTORE NEWS → SUPABASE NEWS MIGRATION');
  console.log('============================================================');
  console.log(`  Firebase Project: ${FIREBASE_PROJECT_ID}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Owner Email: ${OWNER_EMAIL}`);
  console.log('============================================================\n');

  SUPABASE_OWNER_ID = await getSupabaseOwnerId();
  if (!SUPABASE_OWNER_ID) {
    console.error('❌ Could not find owner in Supabase.');
    process.exit(1);
  }

  await migrateNews();

  console.log('\n============================================================');
  console.log('  ✅ NEWS MIGRATION COMPLETE!');
  console.log('============================================================');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
