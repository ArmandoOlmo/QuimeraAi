#!/usr/bin/env node
/**
 * ============================================================
 * RESCUE: sixtomedia@gmail.com content from Firebase → Supabase
 * ============================================================
 *
 *   Firebase UID:  JQCYR5RSx0UZo9atof9VbEWP0w83
 *   Supabase user: 26d2676a-4a96-40cd-ae0a-9e6a863fa601
 *   Supabase tenant: 54c81627-758e-4aae-9dce-5695098426e5
 *
 * What this script does (scoped strictly to sixtomedia):
 *
 *   1. Re-migrates the 3 Firebase projects under `users/{uid}/projects` into
 *      the existing Supabase rows that map to them (by legacyId or name).
 *      The full Firebase `data` document overwrites Supabase's `data` JSONB,
 *      preserving the Supabase row id so external references aren't broken.
 *
 *   2. Strips every Firebase Storage URL it encounters: any string containing
 *      `firebasestorage.googleapis.com`, `firebasestorage.app/`,
 *      `storage.googleapis.com/quimeraai`, or `gs://quimeraai...` becomes "".
 *
 *   3. Migrates subcollections with textual content:
 *      - posts        → posts (editor table) + project_posts (legacy/SSR)
 *      - leads        → leads (active table)
 *      - appointments → project_appointments (active table)
 *
 *      SKIPS `files` subcollection (images: user will re-upload).
 *
 *   4. Idempotent: deterministic UUIDs derived from Firestore doc ids; safe
 *      to re-run.
 *
 * Modes:
 *   --dry-run   (default) print everything but don't write
 *   --apply     actually write to Supabase
 */
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const requireFromFunctions = createRequire(resolve(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');
const requireFromQuimera = createRequire(resolve(ROOT, 'QuimeraAi', 'package.json'));
const { createClient } = requireFromQuimera('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');
const MODE = APPLY ? 'APPLY' : 'DRY-RUN';

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const SIXTO_FB_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';
const SIXTO_SB_ID = '26d2676a-4a96-40cd-ae0a-9e6a863fa601';
const SIXTO_TENANT_ID = '54c81627-758e-4aae-9dce-5695098426e5';

// Firebase project doc id → Supabase project row id (verified via deep compare).
const PROJECT_MAPPING = {
  proj_1770495785601: '00000000-0000-4000-a000-00006cc19712', // Closet Ways
  proj_1770735363583: '00000000-0000-4000-a000-00004ca8a628', // Douglas Candelario (Restored)
  proj_1775662000599: '00000000-0000-4000-a000-000077fe8171', // Carmelo Resiliente (Restored)
};

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

// ----------------------------- helpers -----------------------------
function isFirebaseStorageUrl(s) {
  if (typeof s !== 'string') return false;
  return (
    s.includes('firebasestorage.googleapis.com') ||
    s.includes('firebasestorage.app/') ||
    s.includes('storage.googleapis.com/quimeraai') ||
    s.startsWith('gs://quimeraai')
  );
}

function stripFirebaseUrlsFromString(s) {
  if (!isFirebaseStorageUrl(s)) return s;

  const trimmed = s.trim();
  if (
    /^gs:\/\/quimeraai[^"'\s<>)]*$/.test(trimmed) ||
    /^https?:\/\/firebasestorage\.googleapis\.com[^"'\s<>)]*$/.test(trimmed) ||
    /^https?:\/\/[^"'\s<>)]*firebasestorage\.app[^"'\s<>)]*$/.test(trimmed) ||
    /^https?:\/\/storage\.googleapis\.com\/quimeraai[^"'\s<>)]*$/.test(trimmed)
  ) {
    return '';
  }

  return s
    .replace(/https?:\/\/firebasestorage\.googleapis\.com[^"'\s<>)]*/g, '')
    .replace(/https?:\/\/[^"'\s<>)]*firebasestorage\.app[^"'\s<>)]*/g, '')
    .replace(/https?:\/\/storage\.googleapis\.com\/quimeraai[^"'\s<>)]*/g, '')
    .replace(/gs:\/\/quimeraai[^"'\s<>)]*/g, '');
}

function stripFirebaseUrls(obj, stats = { stripped: 0 }) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (isFirebaseStorageUrl(obj)) {
      stats.stripped++;
      return stripFirebaseUrlsFromString(obj);
    }
    return obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => stripFirebaseUrls(v, stats));
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = stripFirebaseUrls(v, stats);
  return out;
}

function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  // Firestore Timestamp variants
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (
    obj.seconds !== undefined &&
    obj.nanoseconds !== undefined &&
    Object.keys(obj).length === 2
  ) {
    return new Date(obj.seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (typeof obj.toMillis === 'function') return new Date(obj.toMillis()).toISOString();
  if (obj._path && obj._converter !== undefined) return obj.path;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v);
  return out;
}

function deterministicUuid(seed) {
  const hash = crypto.createHash('sha1').update(seed).digest('hex');
  return (
    hash.slice(0, 8) + '-' +
    hash.slice(8, 12) + '-4' +
    hash.slice(13, 16) + '-a' +
    hash.slice(17, 20) + '-' +
    hash.slice(20, 32)
  );
}

function getNameEs(name) {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') return name.es || name.en || '';
  return '';
}

// ----------------------------- project rescue -----------------------------
async function fetchSubcollectionsForProject(fbId) {
  // Returns { settings: {...}, ecommerce: {...}, bioPage: {...} } merged into one object.
  const extras = {};
  // settings/email
  try {
    const settingsSnap = await firestore.collection(`users/${SIXTO_FB_UID}/projects/${fbId}/settings`).get();
    if (!settingsSnap.empty) {
      extras.legacySettings = {};
      for (const d of settingsSnap.docs) {
        extras.legacySettings[d.id] = sanitize(d.data());
      }
    }
  } catch {}
  // ecommerce/config
  try {
    const ecomSnap = await firestore.collection(`users/${SIXTO_FB_UID}/projects/${fbId}/ecommerce`).get();
    if (!ecomSnap.empty) {
      extras.legacyEcommerce = {};
      for (const d of ecomSnap.docs) {
        extras.legacyEcommerce[d.id] = sanitize(d.data());
      }
    }
  } catch {}
  // bioPage at the user level keyed by project id
  try {
    const bioDoc = await firestore.doc(`users/${SIXTO_FB_UID}/bioPages/${fbId}`).get();
    if (bioDoc.exists) {
      extras.legacyBioPage = sanitize(bioDoc.data());
    }
  } catch {}
  return extras;
}

async function rescueProject(fbId, sbId) {
  const fbDoc = await firestore.doc(`users/${SIXTO_FB_UID}/projects/${fbId}`).get();
  if (!fbDoc.exists) {
    console.log(`  [project ${fbId}] Firestore doc not found, skipping.`);
    return;
  }
  const data = sanitize(fbDoc.data());
  const extras = await fetchSubcollectionsForProject(fbId);
  const merged = { ...data, ...extras };
  const stats = { stripped: 0 };
  const cleanData = stripFirebaseUrls(merged, stats);

  const nameEs = getNameEs(cleanData.name);

  console.log(`\n  [project] Firebase ${fbId} → Supabase ${sbId}`);
  console.log(`    name:             ${nameEs}`);
  console.log(`    fbSizeBytes:      ${JSON.stringify(data).length}`);
  console.log(`    mergedSizeBytes:  ${JSON.stringify(merged).length}`);
  console.log(`    cleanSizeBytes:   ${JSON.stringify(cleanData).length}`);
  console.log(`    urlsStripped:     ${stats.stripped}`);
  console.log(`    fbTopKeys:        ${Object.keys(data).length}`);
  console.log(`    extrasAdded:      ${Object.keys(extras).join(', ') || '(none)'}`);

  if (!APPLY) return;

  // Set data + plain `name`. Leave other columns (tenant_id, user_id, status)
  // untouched since they're already correctly populated for sixto.
  const { error } = await supabase
    .from('projects')
    .update({
      data: cleanData,
      name: nameEs,
      last_updated: new Date().toISOString(),
    })
    .eq('id', sbId)
    .eq('user_id', SIXTO_SB_ID);

  if (error) console.error(`    ❌ Update failed: ${error.message}`);
  else console.log(`    ✅ Updated Supabase row`);
}

// ----------------------------- posts (CMS) -----------------------------
async function rescuePosts(fbProjectId, sbProjectId) {
  const path = `users/${SIXTO_FB_UID}/projects/${fbProjectId}/posts`;
  const snap = await firestore.collection(path).get();
  if (snap.empty) {
    console.log(`    [posts] none in Firestore for ${fbProjectId}.`);
    return;
  }

  console.log(`    [posts] ${snap.size} CMS posts in Firestore`);

  const postsRows = [];
  const projectPostsRows = [];
  let totalStripped = 0;

  for (const d of snap.docs) {
    const raw = sanitize(d.data());
    const stats = { stripped: 0 };
    const clean = stripFirebaseUrls(raw, stats);
    totalStripped += stats.stripped;

    const stableId = deterministicUuid(`posts:sixto:${fbProjectId}:${d.id}`);
    const projectTag = `project:${sbProjectId}`;
    const legacyTag = `legacy:${d.id}`;
    const existingTags = Array.isArray(clean.tags) ? clean.tags : [];

    // posts (active CMS table)
    postsRows.push({
      id: stableId,
      tenant_id: SIXTO_TENANT_ID,
      user_id: SIXTO_SB_ID,
      title: clean.title || '(untitled)',
      slug: clean.slug || null,
      content: clean.content || null,
      excerpt: clean.excerpt || null,
      featured_image: '', // stripped
      category: clean.category || null,
      status: clean.status || 'draft',
      tags: [...existingTags, projectTag, legacyTag],
      author_name: clean.author || clean.authorName || null,
      published_at: clean.publishedAt || clean.published_at || null,
      is_featured: !!(clean.isFeatured || clean.is_featured),
      created_at: clean.createdAt || new Date().toISOString(),
      updated_at: clean.updatedAt || new Date().toISOString(),
    });

    // project_posts (legacy / SSR table)
    projectPostsRows.push({
      id: stableId,
      project_id: sbProjectId,
      data: {
        ...clean,
        projectId: sbProjectId,
        legacyFirebaseProjectId: fbProjectId,
        legacyFirebaseDocId: d.id,
      },
    });
  }
  console.log(`      urls stripped: ${totalStripped}`);
  console.log(`      first 3 ids: ${postsRows.slice(0, 3).map((r) => r.id).join(', ')}`);

  if (!APPLY) return;

  // Upsert into posts
  const { error: e1 } = await supabase
    .from('posts')
    .upsert(postsRows, { onConflict: 'id', ignoreDuplicates: false });
  if (e1) {
    console.error(`      ❌ posts upsert failed: ${e1.message}`);
    // Per-row fallback
    for (const row of postsRows) {
      const { error } = await supabase.from('posts').upsert([row], { onConflict: 'id' });
      if (error) console.error(`        post ${row.id}: ${error.message}`);
    }
  } else {
    console.log(`      ✅ upserted ${postsRows.length} rows into posts`);
  }

  // Upsert into project_posts
  const { error: e2 } = await supabase
    .from('project_posts')
    .upsert(projectPostsRows, { onConflict: 'id', ignoreDuplicates: false });
  if (e2) console.error(`      ❌ project_posts upsert failed: ${e2.message}`);
  else console.log(`      ✅ upserted ${projectPostsRows.length} rows into project_posts`);
}

// ----------------------------- leads -----------------------------
async function rescueLeads(fbProjectId, sbProjectId) {
  const path = `users/${SIXTO_FB_UID}/projects/${fbProjectId}/leads`;
  const snap = await firestore.collection(path).get();
  if (snap.empty) {
    console.log(`    [leads] none in Firestore for ${fbProjectId}.`);
    return;
  }

  console.log(`    [leads] ${snap.size} leads in Firestore`);

  const rows = [];
  let totalStripped = 0;

  for (const d of snap.docs) {
    const raw = sanitize(d.data());
    const stats = { stripped: 0 };
    const clean = stripFirebaseUrls(raw, stats);
    totalStripped += stats.stripped;

    const stableId = deterministicUuid(`leads:sixto:${fbProjectId}:${d.id}`);
    rows.push({
      id: stableId,
      tenant_id: SIXTO_TENANT_ID,
      project_id: sbProjectId,
      name: clean.name || null,
      email: clean.email || null,
      phone: clean.phone || null,
      company: clean.company || null,
      status: clean.status || null,
      source: clean.source || null,
      value: typeof clean.value === 'number' ? clean.value : null,
      tags: Array.isArray(clean.tags) ? clean.tags : null,
      notes: typeof clean.notes === 'string' ? clean.notes : (clean.notes ? JSON.stringify(clean.notes) : null),
      custom_data: {
        legacyFirebaseDocId: d.id,
        legacyFirebaseProjectId: fbProjectId,
        ...(clean.message ? { message: clean.message } : {}),
        ...(clean.conversationTranscript ? { conversationTranscript: clean.conversationTranscript } : {}),
      },
      last_contact_date: clean.lastContactDate || null,
      created_at: clean.createdAt || new Date().toISOString(),
      updated_at: clean.updatedAt || new Date().toISOString(),
    });
  }
  console.log(`      urls stripped: ${totalStripped}`);

  if (!APPLY) return;

  const { error } = await supabase
    .from('leads')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  if (error) {
    console.error(`      ❌ leads upsert failed: ${error.message}`);
    for (const row of rows) {
      const { error: e2 } = await supabase.from('leads').upsert([row], { onConflict: 'id' });
      if (e2) console.error(`        lead ${row.id}: ${e2.message}`);
    }
  } else {
    console.log(`      ✅ upserted ${rows.length} rows into leads`);
  }
}

// ----------------------------- appointments -----------------------------
async function rescueAppointments(fbProjectId, sbProjectId) {
  const path = `users/${SIXTO_FB_UID}/projects/${fbProjectId}/appointments`;
  const snap = await firestore.collection(path).get();
  if (snap.empty) {
    console.log(`    [appointments] none in Firestore for ${fbProjectId}.`);
    return;
  }

  console.log(`    [appointments] ${snap.size} appointments in Firestore`);

  const rows = [];
  let totalStripped = 0;

  for (const d of snap.docs) {
    const raw = sanitize(d.data());
    const stats = { stripped: 0 };
    const clean = stripFirebaseUrls(raw, stats);
    totalStripped += stats.stripped;

    const stableId = deterministicUuid(`appt:sixto:${fbProjectId}:${d.id}`);
    rows.push({
      id: stableId,
      project_id: sbProjectId,
      tenant_id: SIXTO_TENANT_ID,
      title: clean.title || '(untitled)',
      description: clean.description || null,
      type: clean.type || 'consultation',
      status: clean.status || 'scheduled',
      priority: clean.priority || 'medium',
      start_date: clean.startDate || new Date().toISOString(),
      end_date: clean.endDate || null,
      timezone: clean.timezone || 'UTC',
      all_day: !!clean.allDay,
      organizer_id: clean.organizerId === SIXTO_FB_UID ? SIXTO_SB_ID : null,
      organizer_name: clean.organizerName || null,
      organizer_email: clean.organizerEmail || null,
      participants: Array.isArray(clean.participants) ? clean.participants : [],
      location: clean.location || { type: 'virtual' },
      reminders: Array.isArray(clean.reminders) ? clean.reminders : [],
      attachments: Array.isArray(clean.attachments) ? clean.attachments : [],
      notes: Array.isArray(clean.notes) ? clean.notes : [],
      follow_up_actions: Array.isArray(clean.followUpActions) ? clean.followUpActions : [],
      ai_prep_enabled: clean.aiPrepEnabled !== false,
      linked_lead_ids: Array.isArray(clean.linkedLeadIds) ? clean.linkedLeadIds : null,
      tags: Array.isArray(clean.tags) ? clean.tags : null,
      created_at: clean.createdAt || new Date().toISOString(),
      updated_at: clean.updatedAt || new Date().toISOString(),
    });
  }
  console.log(`      urls stripped: ${totalStripped}`);

  if (!APPLY) return;

  const { error } = await supabase
    .from('project_appointments')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  if (error) {
    console.error(`      ❌ project_appointments upsert failed: ${error.message}`);
    for (const row of rows) {
      const { error: e2 } = await supabase.from('project_appointments').upsert([row], { onConflict: 'id' });
      if (e2) console.error(`        appt ${row.id}: ${e2.message}`);
    }
  } else {
    console.log(`      ✅ upserted ${rows.length} rows into project_appointments`);
  }
}

// ----------------------------- store products (strip URLs only) -----------------------------
async function cleanSixtoStoreProducts() {
  console.log('\n  [store_products] cleaning Firebase URLs');
  const { data: rows, error } = await supabase
    .from('store_products')
    .select('id, store_id, data')
    .in('store_id', Object.keys(PROJECT_MAPPING)); // store ids = legacy Firebase project ids
  if (error) {
    console.error(`    ❌ Read failed: ${error.message}`);
    return;
  }
  console.log(`    rows: ${rows.length}`);
  for (const row of rows) {
    const stats = { stripped: 0 };
    const cleanData = stripFirebaseUrls(row.data || {}, stats);
    console.log(`    product ${row.id} | store ${row.store_id} | urls=${stats.stripped}`);
    if (!APPLY || stats.stripped === 0) continue;
    const { error: updErr } = await supabase
      .from('store_products')
      .update({ data: cleanData })
      .eq('id', row.id);
    if (updErr) console.error(`      ❌ Update failed: ${updErr.message}`);
    else console.log(`      ✅ Cleaned product ${row.id}`);
  }
}

async function cleanSixtoPublicStores() {
  console.log('\n  [public_stores] cleaning Firebase URLs');
  const { data: rows, error } = await supabase
    .from('public_stores')
    .select('id, data')
    .eq('user_id', SIXTO_SB_ID);
  if (error) {
    console.error(`    ❌ Read failed: ${error.message}`);
    return;
  }
  console.log(`    rows: ${rows.length}`);
  for (const row of rows) {
    const stats = { stripped: 0 };
    const cleanData = stripFirebaseUrls(row.data || {}, stats);
    console.log(`    store ${row.id} | urls=${stats.stripped}`);
    if (!APPLY || stats.stripped === 0) continue;
    const { error: updErr } = await supabase
      .from('public_stores')
      .update({ data: cleanData })
      .eq('id', row.id);
    if (updErr) console.error(`      ❌ Update failed: ${updErr.message}`);
    else console.log(`      ✅ Cleaned store ${row.id}`);
  }
}

async function fixSixtoDomainLinks() {
  console.log('\n  [custom_domains] fixing project_id links');
  // Read Firebase domains to find which project they belong to.
  const fbDomainsSnap = await firestore.collection(`users/${SIXTO_FB_UID}/domains`).get();
  const fbMap = new Map(); // domain_name -> fbProjectId
  fbDomainsSnap.docs.forEach((d) => {
    const data = d.data();
    fbMap.set((data.domain || data.name || d.id).toLowerCase(), data.projectId);
  });

  const { data: rows, error } = await supabase
    .from('custom_domains')
    .select('domain_name, project_id, data')
    .eq('user_id', SIXTO_SB_ID);
  if (error) {
    console.error(`    ❌ Read failed: ${error.message}`);
    return;
  }

  for (const row of rows) {
    const fbProjId = fbMap.get(row.domain_name.toLowerCase());
    const expectedSbId = fbProjId ? PROJECT_MAPPING[fbProjId] : null;
    const cleanData = stripFirebaseUrls(row.data || {}, { stripped: 0 });
    console.log(`    ${row.domain_name} | current=${row.project_id} | expected=${expectedSbId || '(unknown)'}`);
    if (!APPLY) continue;
    const update = { data: cleanData };
    if (expectedSbId && row.project_id !== expectedSbId) update.project_id = expectedSbId;
    if (Object.keys(update).length === 0) continue;
    const { error: updErr } = await supabase
      .from('custom_domains')
      .update(update)
      .eq('domain_name', row.domain_name);
    if (updErr) console.error(`      ❌ Update failed: ${updErr.message}`);
    else console.log(`      ✅ Updated ${row.domain_name}`);
  }
}

// ----------------------------- main -----------------------------
async function main() {
  console.log('============================================================');
  console.log(`  RESCUE sixtomedia@gmail.com  [mode=${MODE}]`);
  console.log('============================================================');

  for (const [fbId, sbId] of Object.entries(PROJECT_MAPPING)) {
    await rescueProject(fbId, sbId);
    await rescuePosts(fbId, sbId);
    await rescueLeads(fbId, sbId);
    await rescueAppointments(fbId, sbId);
    // files: SKIPPED on purpose (images, user will re-upload)
  }

  // Store-level cleanup (strip URLs only; data is already in Supabase)
  await cleanSixtoPublicStores();
  await cleanSixtoStoreProducts();
  // Domain links (already in Supabase; just fix project_id linkage)
  await fixSixtoDomainLinks();

  console.log('\n============================================================');
  if (APPLY) console.log('  ✅ DONE — changes applied.');
  else console.log('  Dry-run complete. Re-run with --apply to write.');
  console.log('============================================================');
}

main().catch((err) => {
  console.error('\n❌ Rescue failed:', err);
  process.exit(1);
});
