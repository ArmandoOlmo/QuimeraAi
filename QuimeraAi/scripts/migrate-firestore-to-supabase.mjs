#!/usr/bin/env node
/**
 * ============================================================
 * FIRESTORE → SUPABASE DATA MIGRATION SCRIPT
 * ============================================================
 * 
 * Migrates ALL data from Firebase Firestore to Supabase PostgreSQL.
 * Uses firebase-admin with ADC (Application Default Credentials).
 * Uses Supabase service role key for unrestricted writes (bypasses RLS).
 *
 * Usage:
 *   node scripts/migrate-firestore-to-supabase.mjs
 *
 * Prerequisites:
 *   - gcloud auth application-default login
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or hardcoded below)
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIGURATION
// ============================================================

const FIREBASE_PROJECT_ID = 'quimeraai';

// Supabase config — uses service role key to bypass RLS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Owner's Firebase UID (the user whose data we're migrating)
// We'll discover this dynamically from Firestore
const OWNER_EMAIL = 'armandoolmomiranda@gmail.com';

// The new Supabase auth user ID for the owner
// This will be fetched from Supabase auth
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
// INIT SUPABASE (Service Role = bypass RLS)
// ============================================================

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required. Set it as an env variable.');
  console.error('   Find it at: Supabase Dashboard → Settings → API → service_role key');
  console.error('   Usage: SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-firestore-to-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// HELPERS
// ============================================================

/** Convert Firestore Timestamps to ISO strings recursively */
function sanitizeData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  // Firestore Timestamp
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  // Firestore DocumentReference
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

/** Upsert rows into Supabase (insert, skip conflicts) */
async function upsertBatch(table, rows, conflictColumn = 'id') {
  if (rows.length === 0) return 0;

  // Supabase has a batch limit, chunk into groups of 500
  const CHUNK_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictColumn, ignoreDuplicates: false });

    if (error) {
      console.error(`  ❌ Error upserting into ${table}:`, error.message);
      // Try one-by-one for debugging
      for (const row of chunk) {
        const { error: singleError } = await supabase
          .from(table)
          .upsert([row], { onConflict: conflictColumn, ignoreDuplicates: true });
        if (singleError) {
          console.error(`    ❌ Row ${row.id}: ${singleError.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += chunk.length;
    }
  }

  return inserted;
}

/** List all top-level collections in Firestore */
async function discoverCollections() {
  console.log('\n🔍 Discovering top-level collections...');
  try {
    const collections = await firestore.listCollections();
    const names = collections.map(col => col.id);
    console.log(`  Found ${names.length} collections: ${names.join(', ')}`);
    return names;
  } catch (e) {
    console.error('  ❌ Error listing collections:', e.message);
    return [];
  }
}

// ============================================================
// MIGRATION STEPS
// ============================================================

async function getSupabaseOwnerId() {
  console.log('\n🔍 Finding Supabase owner user...');
  
  // Use admin API to list users
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('❌ Cannot list Supabase users:', error.message);
    return null;
  }

  const owner = data.users.find(u => u.email === OWNER_EMAIL);
  if (owner) {
    console.log(`  ✅ Found owner: ${owner.email} → ${owner.id}`);
    return owner.id;
  }

  console.warn(`  ⚠️  Owner email ${OWNER_EMAIL} not found in Supabase auth.`);
  // Fallback: use first user
  if (data.users.length > 0) {
    console.log(`  Using first user: ${data.users[0].email} → ${data.users[0].id}`);
    return data.users[0].id;
  }

  return null;
}

async function findFirebaseOwnerUIDs() {
  console.log('\n🔍 Finding Firebase owner UIDs...');
  
  // List all users in Firestore 'users' collection and find the owner
  const usersSnap = await firestore.collection('users').get();
  const ownerUIDs = [];
  const allUIDs = new Map(); // firebase_uid → email

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    allUIDs.set(doc.id, data.email || '');
    
    if (data.email === OWNER_EMAIL || data.role === 'owner') {
      ownerUIDs.push(doc.id);
      console.log(`  ✅ Found Firebase owner: ${data.email} → UID: ${doc.id}`);
    }
  }

  console.log(`  Total Firestore users: ${usersSnap.size}`);
  return { ownerUIDs, allUIDs };
}

// 1. Migrate Users
async function migrateUsers(firebaseUIDs) {
  console.log('\n📋 Migrating users...');
  const usersSnap = await firestore.collection('users').get();
  const rows = [];

  for (const doc of usersSnap.docs) {
    const data = sanitizeData(doc.data());
    const isOwner = firebaseUIDs.includes(doc.id);
    
    // Map Firebase UID to Supabase UUID
    // For the owner, use the Supabase auth UID
    // For other users, we'll create a deterministic UUID
    const supabaseId = isOwner ? SUPABASE_OWNER_ID : null;
    
    if (!supabaseId) {
      console.log(`  ⏭️  Skipping non-owner user: ${data.email || doc.id}`);
      continue; // Only migrate owner for now
    }

    rows.push({
      id: supabaseId,
      email: data.email || '',
      role: data.role || 'user',
      data: data,
    });
  }

  const count = await upsertBatch('users', rows);
  console.log(`  ✅ Migrated ${count} users`);
  return rows;
}

// 2. Migrate global_settings
async function migrateGlobalSettings() {
  console.log('\n📋 Migrating global_settings...');
  const snap = await firestore.collection('globalSettings').get();
  const rows = [];

  for (const doc of snap.docs) {
    rows.push({
      id: doc.id,
      data: sanitizeData(doc.data()),
    });
  }

  // Also try 'global_settings' collection
  try {
    const snap2 = await firestore.collection('global_settings').get();
    for (const doc of snap2.docs) {
      if (!rows.find(r => r.id === doc.id)) {
        rows.push({
          id: doc.id,
          data: sanitizeData(doc.data()),
        });
      }
    }
  } catch (e) {
    // Collection might not exist
  }

  // Also try 'settings' collection
  try {
    const snap3 = await firestore.collection('settings').get();
    for (const doc of snap3.docs) {
      if (!rows.find(r => r.id === doc.id)) {
        rows.push({
          id: doc.id,
          data: sanitizeData(doc.data()),
        });
      }
    }
  } catch (e) {
    // Collection might not exist  
  }

  const count = await upsertBatch('global_settings', rows);
  console.log(`  ✅ Migrated ${count} global settings`);
}

// 3. Migrate Templates
async function migrateTemplates() {
  console.log('\n📋 Migrating templates...');
  const snap = await firestore.collection('templates').get();
  const rows = [];

  for (const doc of snap.docs) {
    rows.push({
      id: doc.id,
      data: sanitizeData(doc.data()),
    });
  }

  const count = await upsertBatch('templates', rows);
  console.log(`  ✅ Migrated ${count} templates`);
}

// 4. Migrate Projects (user subcollections)
async function migrateProjects(firebaseOwnerUIDs) {
  console.log('\n📋 Migrating projects...');
  let totalProjects = 0;

  for (const firebaseUID of firebaseOwnerUIDs) {
    console.log(`  Reading projects for Firebase UID: ${firebaseUID}`);
    const snap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    const rows = [];

    for (const doc of snap.docs) {
      const data = sanitizeData(doc.data());
      rows.push({
        id: doc.id,
        user_id: SUPABASE_OWNER_ID,
        data: data,
      });
    }

    const count = await upsertBatch('projects', rows);
    totalProjects += count;
    console.log(`  ✅ Migrated ${count} projects from UID ${firebaseUID}`);
  }

  // Also check for tenant-level projects
  try {
    const tenantsSnap = await firestore.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const projSnap = await firestore.collection(`tenants/${tenantDoc.id}/projects`).get();
      if (projSnap.size > 0) {
        const rows = projSnap.docs.map(doc => ({
          id: doc.id,
          user_id: SUPABASE_OWNER_ID,
          data: { ...sanitizeData(doc.data()), tenantId: tenantDoc.id },
        }));
        const count = await upsertBatch('projects', rows);
        totalProjects += count;
        console.log(`  ✅ Migrated ${count} tenant projects from tenant ${tenantDoc.id}`);
      }
    }
  } catch (e) {
    console.log('  ℹ️  No tenant projects found');
  }

  console.log(`  ✅ Total projects migrated: ${totalProjects}`);
}

// 5. Migrate Tenants
async function migrateTenants() {
  console.log('\n📋 Migrating tenants...');
  const snap = await firestore.collection('tenants').get();
  const rows = [];

  for (const doc of snap.docs) {
    const data = sanitizeData(doc.data());
    rows.push({
      id: doc.id,
      owner_id: SUPABASE_OWNER_ID,
      data: data,
    });
  }

  const count = await upsertBatch('tenants', rows);
  console.log(`  ✅ Migrated ${count} tenants`);
}

// 6. Migrate Tenant Members
async function migrateTenantMembers() {
  console.log('\n📋 Migrating tenant_members...');
  let total = 0;

  const tenantsSnap = await firestore.collection('tenants').get();
  for (const tenantDoc of tenantsSnap.docs) {
    const membersSnap = await firestore.collection(`tenants/${tenantDoc.id}/members`).get();
    const rows = [];
    for (const doc of membersSnap.docs) {
      const data = sanitizeData(doc.data());
      rows.push({
        id: doc.id,
        tenant_id: tenantDoc.id,
        user_id: SUPABASE_OWNER_ID, // Map to owner for now
        role: data.role || 'member',
        data: data,
      });
    }
    const count = await upsertBatch('tenant_members', rows);
    total += count;
  }

  console.log(`  ✅ Migrated ${total} tenant members`);
}

// 7. Migrate Project Subcollections (leads, files, posts, etc.)
async function migrateProjectSubcollections(firebaseOwnerUIDs) {
  console.log('\n📋 Migrating project subcollections...');

  const subcollectionMap = [
    { firestore: 'leads', supabase: 'project_leads', fk: 'project_id' },
    { firestore: 'files', supabase: 'project_files', fk: 'project_id' },
    { firestore: 'appointments', supabase: 'project_appointments', fk: 'project_id' },
    { firestore: 'posts', supabase: 'project_posts', fk: 'project_id' },
    { firestore: 'finance', supabase: 'project_finance', fk: 'project_id' },
  ];

  for (const firebaseUID of firebaseOwnerUIDs) {
    const projectsSnap = await firestore.collection(`users/${firebaseUID}/projects`).get();

    for (const projectDoc of projectsSnap.docs) {
      for (const { firestore: fsCollection, supabase: sbTable, fk } of subcollectionMap) {
        try {
          const subSnap = await firestore
            .collection(`users/${firebaseUID}/projects/${projectDoc.id}/${fsCollection}`)
            .get();

          if (subSnap.size > 0) {
            const rows = subSnap.docs.map(doc => ({
              id: doc.id,
              [fk]: projectDoc.id,
              data: sanitizeData(doc.data()),
            }));
            const count = await upsertBatch(sbTable, rows);
            if (count > 0) {
              console.log(`  ✅ ${sbTable}: ${count} rows for project ${projectDoc.id}`);
            }
          }
        } catch (e) {
          // Subcollection doesn't exist, that's fine
        }
      }
    }
  }
}

// 8. Migrate Domains
async function migrateDomains() {
  console.log('\n📋 Migrating domains...');

  // Custom domains
  try {
    const snap = await firestore.collection('customDomains').get();
    const rows = snap.docs.map(doc => ({
      domain_name: doc.id,
      user_id: SUPABASE_OWNER_ID,
      data: sanitizeData(doc.data()),
    }));
    const count = await upsertBatch('custom_domains', rows, 'domain_name');
    console.log(`  ✅ Migrated ${count} custom domains`);
  } catch (e) {
    console.log('  ℹ️  No custom domains found');
  }

  // Subdomains
  try {
    const snap = await firestore.collection('subdomains').get();
    const rows = snap.docs.map(doc => ({
      subdomain_name: doc.id,
      user_id: SUPABASE_OWNER_ID,
      data: sanitizeData(doc.data()),
    }));
    const count = await upsertBatch('subdomains', rows, 'subdomain_name');
    console.log(`  ✅ Migrated ${count} subdomains`);
  } catch (e) {
    console.log('  ℹ️  No subdomains found');
  }
}

// 9. Migrate Changelog
async function migrateChangelog() {
  console.log('\n📋 Migrating changelog...');
  try {
    const snap = await firestore.collection('changelog').get();
    const rows = snap.docs.map(doc => ({
      id: doc.id,
      data: sanitizeData(doc.data()),
    }));
    const count = await upsertBatch('changelog', rows);
    console.log(`  ✅ Migrated ${count} changelog entries`);
  } catch (e) {
    console.log('  ℹ️  No changelog found');
  }
}

// 10. Migrate Prompts
async function migratePrompts() {
  console.log('\n📋 Migrating prompts...');
  try {
    const snap = await firestore.collection('prompts').get();
    const rows = snap.docs.map(doc => ({
      id: doc.id,
      data: sanitizeData(doc.data()),
    }));
    const count = await upsertBatch('prompts', rows);
    console.log(`  ✅ Migrated ${count} prompts`);
  } catch (e) {
    console.log('  ℹ️  No prompts found');
  }
}

// 11. Migrate Custom Components
async function migrateCustomComponents() {
  console.log('\n📋 Migrating custom_components...');
  try {
    const snap = await firestore.collection('customComponents').get();
    const rows = snap.docs.map(doc => ({
      id: doc.id,
      user_id: SUPABASE_OWNER_ID,
      data: sanitizeData(doc.data()),
    }));
    const count = await upsertBatch('custom_components', rows);
    console.log(`  ✅ Migrated ${count} custom components`);
  } catch (e) {
    console.log('  ℹ️  No custom components found');
  }
}

// 12. Migrate E-commerce stores
async function migrateEcommerce(firebaseOwnerUIDs) {
  console.log('\n📋 Migrating e-commerce data...');

  for (const firebaseUID of firebaseOwnerUIDs) {
    // Public stores
    try {
      const storesSnap = await firestore.collection(`users/${firebaseUID}/stores`).get();
      if (storesSnap.size > 0) {
        const storeRows = storesSnap.docs.map(doc => ({
          id: doc.id,
          user_id: SUPABASE_OWNER_ID,
          data: sanitizeData(doc.data()),
        }));
        const count = await upsertBatch('public_stores', storeRows);
        console.log(`  ✅ Migrated ${count} stores`);

        // Store subcollections
        const storeSubcollections = [
          { name: 'products', table: 'store_products' },
          { name: 'categories', table: 'store_categories' },
          { name: 'orders', table: 'store_orders' },
          { name: 'reviews', table: 'store_reviews' },
          { name: 'discounts', table: 'store_discounts' },
        ];

        for (const storeDoc of storesSnap.docs) {
          for (const { name, table } of storeSubcollections) {
            try {
              const subSnap = await firestore
                .collection(`users/${firebaseUID}/stores/${storeDoc.id}/${name}`)
                .get();
              if (subSnap.size > 0) {
                const rows = subSnap.docs.map(doc => ({
                  id: doc.id,
                  store_id: storeDoc.id,
                  ...(table === 'store_orders' ? { user_id: SUPABASE_OWNER_ID } : {}),
                  data: sanitizeData(doc.data()),
                }));
                const count = await upsertBatch(table, rows);
                if (count > 0) {
                  console.log(`  ✅ ${table}: ${count} rows for store ${storeDoc.id}`);
                }
              }
            } catch (e) {
              // Subcollection doesn't exist
            }
          }
        }
      }
    } catch (e) {
      console.log('  ℹ️  No stores found');
    }
  }

  // Also check top-level 'publicStores' collection
  try {
    const snap = await firestore.collection('publicStores').get();
    if (snap.size > 0) {
      const rows = snap.docs.map(doc => ({
        id: doc.id,
        user_id: SUPABASE_OWNER_ID,
        data: sanitizeData(doc.data()),
      }));
      const count = await upsertBatch('public_stores', rows);
      console.log(`  ✅ Migrated ${count} public stores (top-level)`);
    }
  } catch (e) {
    // Collection doesn't exist
  }
}

// 13. Migrate Plans (from global settings subcollection)
async function migratePlans() {
  console.log('\n📋 Migrating plans...');
  
  // Plans might be in globalSettings/plans/items or similar
  const planPaths = [
    'globalSettings/plans',
    'plans',
  ];

  for (const path of planPaths) {
    try {
      // Try as a document
      const doc = await firestore.doc(path).get();
      if (doc.exists) {
        const data = sanitizeData(doc.data());
        await upsertBatch('global_settings', [{ id: 'plans', data }]);
        console.log(`  ✅ Migrated plans from ${path}`);
        return;
      }
    } catch (e) {}

    try {
      // Try as a collection
      const snap = await firestore.collection(path).get();
      if (snap.size > 0) {
        const plansData = {};
        snap.docs.forEach(d => {
          plansData[d.id] = sanitizeData(d.data());
        });
        await upsertBatch('global_settings', [{ id: 'plans', data: plansData }]);
        console.log(`  ✅ Migrated ${snap.size} plans from ${path}`);
        return;
      }
    } catch (e) {}
  }

  console.log('  ℹ️  No plans collection found');
}

// 14. Migrate App Content (Blog, Landing Config)
async function migrateAppContent() {
  console.log('\n📦 Migrating App Content (Blog & Landing Config)...');

  // 1. Articles (Blog/Help)
  const articlesSnap = await firestore.collection('appContent/data/articles').get();
  if (articlesSnap.size > 0) {
    const articles = articlesSnap.docs.map(doc => {
      const data = sanitizeData(doc.data());
      return {
        id: doc.id,
        slug: data.slug || doc.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        content: data.body || data.content || '',
        category: data.category || 'blog',
        tags: data.tags || [],
        image_url: data.imageUrl || data.featuredImage || null,
        author: data.createdBy || data.author || 'Quimera AI',
        status: data.status || 'published',
        featured: !!data.featured,
        priority: data.priority || 0,
        language: data.language || 'es',
        translation_group: data.translationGroup || null,
        read_time: data.readTime || 1,
        views: data.views || 0,
        published_at: data.publishAt || data.publishedAt || data.createdAt || new Date().toISOString(),
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      };
    });
    await upsertBatch('app_articles', articles);
    console.log(`  ✅ Migrated ${articles.length} articles from appContent/data/articles`);
  }

  // 2. Landing Config
  const landingDoc = await firestore.doc('globalSettings/landingPage').get();
  if (landingDoc.exists) {
    const data = sanitizeData(landingDoc.data());
    const config = {
      id: 'landing',
      hero_title: data.hero?.title || null,
      hero_subtitle: data.hero?.subtitle || null,
      hero_image: data.hero?.image || null,
      features: data.features || [],
      cta_text: data.cta?.primaryCTA?.text || null,
      cta_link: data.cta?.primaryCTA?.href || null,
      data: data, // Store the full config object for the UI
      updated_at: data.lastUpdated || new Date().toISOString()
    };
    await upsertBatch('app_landing_config', [config]);
    console.log(`  ✅ Migrated landing config from globalSettings/landingPage (with full data payload)`);
  }
}

// 15. Migrate News root collection
async function migrateNews() {
  console.log('\n📦 Migrating News root collection...');
  const newsSnap = await firestore.collection('news').get();
  if (newsSnap.size > 0) {
    const newsItems = newsSnap.docs.map(doc => {
      const data = sanitizeData(doc.data());
      const cta = data.cta || {};

      return {
        id: doc.id,
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        content: data.body || data.content || '',
        category: data.category || 'update',
        status: data.status || 'published',
        priority: data.priority || 0,
        featured: !!data.featured,
        image_url: data.imageUrl || null,
        link_url: data.link_url || data.linkUrl || cta.url || cta.href || cta.primaryCTA?.href || null,
        link_text: data.link_text || data.linkText || cta.label || cta.text || cta.primaryCTA?.text || null,
        targeting: data.targeting || { type: 'all' },
        tags: data.tags || [],
        video_url: data.videoUrl || data.video_url || null,
        language: data.language || 'es',
        translation_group: data.translationGroup || data.translation_group || null,
        views: data.views || 0,
        clicks: data.clicks || 0,
        publish_at: data.publishAt || data.publishedAt || data.createdAt || new Date().toISOString(),
        expire_at: data.expireAt || data.expire_at || null,
        created_by: data.createdBy || 'Quimera AI',
        updated_by: data.updatedBy || 'Quimera AI',
        created_at: data.createdAt || new Date().toISOString(),
        updated_at: data.updatedAt || new Date().toISOString()
      };
    });
    await upsertBatch('news_items', newsItems);
    console.log(`  ✅ Migrated ${newsItems.length} news items to news_items`);
  }
}

// 16. Discover and list ALL top-level Firestore collections

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('  FIRESTORE → SUPABASE DATA MIGRATION');
  console.log('============================================================');
  console.log(`  Firebase Project: ${FIREBASE_PROJECT_ID}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log(`  Owner Email: ${OWNER_EMAIL}`);
  console.log('============================================================\n');

  // Step 0: Get Supabase owner ID
  SUPABASE_OWNER_ID = await getSupabaseOwnerId();
  if (!SUPABASE_OWNER_ID) {
    console.error('❌ Could not find owner in Supabase. Please login first.');
    process.exit(1);
  }

  // Step 1: Discover all collections
  const allCollections = await discoverCollections();

  // Step 2: Find Firebase owner UIDs  
  const { ownerUIDs } = await findFirebaseOwnerUIDs();
  if (ownerUIDs.length === 0) {
    console.warn('⚠️  No owner found in Firestore users collection.');
    console.warn('   Trying to use all users with documents...');
    const usersSnap = await firestore.collection('users').get();
    ownerUIDs.push(...usersSnap.docs.map(d => d.id));
  }

  console.log(`\n📦 Starting migration for ${ownerUIDs.length} Firebase UIDs → Supabase owner ${SUPABASE_OWNER_ID}\n`);

  // Step 3: Run migrations in order (respecting FK constraints)
  await migrateUsers(ownerUIDs);
  await migrateGlobalSettings();
  await migratePlans();
  await migrateTemplates();
  await migrateAppContent();
  await migrateNews();
  await migrateTenants();
  await migrateTenantMembers();
  await migrateProjects(ownerUIDs);
  await migrateProjectSubcollections(ownerUIDs);
  await migrateDomains();
  await migrateChangelog();
  await migratePrompts();
  await migrateCustomComponents();
  await migrateEcommerce(ownerUIDs);

  console.log('\n============================================================');
  console.log('  ✅ MIGRATION COMPLETE!');
  console.log('============================================================');
  console.log('\nNext steps:');
  console.log('  1. Restart your dev server: npm run dev');
  console.log('  2. Login and verify your data appears');
  console.log('  3. Check the browser console for any errors');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
