#!/usr/bin/env node
/**
 * Fix Schema + Re-migrate from Firestore
 * 
 * The browser subagent corrupted the schema by replacing the original tables.
 * This script:
 * 1. Drops the broken tables
 * 2. Recreates them with the correct schema (TEXT PKs + JSONB data column)
 * 3. Applies correct RLS policies
 * 4. Re-runs the Firestore migration
 */

import pg from 'pg';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIG
// ============================================================

const DB_CONNECTION = 'postgresql://postgres.elfcrnhffuvntlfuvumd:quimeraai2025@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const SUPABASE_URL = 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FIREBASE_PROJECT_ID = 'quimeraai';
const OWNER_EMAIL = 'armandoolmomiranda@gmail.com';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

// ============================================================
// STEP 1: Fix schema via direct PostgreSQL connection
// ============================================================

async function fixSchema() {
  console.log('\n🔧 STEP 1: Fixing database schema...\n');
  
  const client = new pg.Client({ connectionString: DB_CONNECTION });
  await client.connect();
  console.log('  Connected to PostgreSQL');

  const statements = [
    // Drop broken tables (CASCADE removes dependent objects)
    'DROP TABLE IF EXISTS project_leads CASCADE',
    'DROP TABLE IF EXISTS project_files CASCADE',
    'DROP TABLE IF EXISTS project_appointments CASCADE',
    'DROP TABLE IF EXISTS project_posts CASCADE',
    'DROP TABLE IF EXISTS project_finance CASCADE',
    'DROP TABLE IF EXISTS store_products CASCADE',
    'DROP TABLE IF EXISTS store_categories CASCADE',
    'DROP TABLE IF EXISTS store_discounts CASCADE',
    'DROP TABLE IF EXISTS store_reviews CASCADE',
    'DROP TABLE IF EXISTS store_stock_notifications CASCADE',
    'DROP TABLE IF EXISTS store_orders CASCADE',
    'DROP TABLE IF EXISTS user_carts CASCADE',
    'DROP TABLE IF EXISTS store_wishlists CASCADE',
    'DROP TABLE IF EXISTS store_customers CASCADE',
    'DROP TABLE IF EXISTS store_segments CASCADE',
    'DROP TABLE IF EXISTS store_user_activities CASCADE',
    'DROP TABLE IF EXISTS public_stores CASCADE',
    'DROP TABLE IF EXISTS tenant_invites CASCADE',
    'DROP TABLE IF EXISTS agency_activity CASCADE',
    'DROP TABLE IF EXISTS tenant_members CASCADE',
    'DROP TABLE IF EXISTS projects CASCADE',
    'DROP TABLE IF EXISTS tenants CASCADE',
    'DROP TABLE IF EXISTS custom_domains CASCADE',
    'DROP TABLE IF EXISTS subdomains CASCADE',
    'DROP TABLE IF EXISTS custom_components CASCADE',
    'DROP TABLE IF EXISTS changelog CASCADE',
    'DROP TABLE IF EXISTS prompts CASCADE',
    'DROP TABLE IF EXISTS templates CASCADE',
    'DROP TABLE IF EXISTS global_settings CASCADE',
    
    // Recreate with correct schema (TEXT PKs + JSONB data)
    `CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tenant_members (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS project_leads (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS project_appointments (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS project_posts (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS project_finance (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS custom_domains (
      domain_name TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS subdomains (
      subdomain_name TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS public_stores (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS store_products (
      id TEXT PRIMARY KEY,
      store_id TEXT REFERENCES public_stores(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS store_orders (
      id TEXT PRIMARY KEY,
      store_id TEXT,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS global_settings (
      id TEXT PRIMARY KEY,
      data JSONB DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS changelog (
      id TEXT PRIMARY KEY,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS custom_components (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tenant_invites (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS agency_activity (
      id TEXT PRIMARY KEY,
      agency_tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    // Enable RLS
    'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE projects ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE project_files ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE project_appointments ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE project_posts ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE project_finance ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE public_stores ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE store_products ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE templates ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE changelog ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE custom_components ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE prompts ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE agency_activity ENABLE ROW LEVEL SECURITY',

    // RLS Policies

    // Tenants
    `CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (
      owner_id = auth.uid() OR
      auth.uid() IN (SELECT user_id FROM tenant_members WHERE tenant_id = tenants.id)
    )`,
    `CREATE POLICY "tenants_insert" ON tenants FOR INSERT WITH CHECK (owner_id = auth.uid())`,
    `CREATE POLICY "tenants_update" ON tenants FOR UPDATE USING (owner_id = auth.uid())`,
    `CREATE POLICY "tenants_delete" ON tenants FOR DELETE USING (owner_id = auth.uid())`,

    // Tenant Members
    `CREATE POLICY "tm_select" ON tenant_members FOR SELECT USING (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "tm_insert" ON tenant_members FOR INSERT WITH CHECK (
      tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()) OR user_id = auth.uid()
    )`,
    `CREATE POLICY "tm_manage" ON tenant_members FOR UPDATE USING (
      tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    )`,
    `CREATE POLICY "tm_delete" ON tenant_members FOR DELETE USING (
      tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    )`,

    // Projects
    `CREATE POLICY "proj_select" ON projects FOR SELECT USING (user_id = auth.uid())`,
    `CREATE POLICY "proj_insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid())`,
    `CREATE POLICY "proj_update" ON projects FOR UPDATE USING (user_id = auth.uid())`,
    `CREATE POLICY "proj_delete" ON projects FOR DELETE USING (user_id = auth.uid())`,

    // Project subcollections
    `CREATE POLICY "pl_all" ON project_leads FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "pf_all" ON project_files FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "pa_all" ON project_appointments FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "pp_all" ON project_posts FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "pfin_all" ON project_finance FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )`,

    // Domains
    `CREATE POLICY "cd_all" ON custom_domains FOR ALL USING (user_id = auth.uid())`,
    `CREATE POLICY "sd_all" ON subdomains FOR ALL USING (user_id = auth.uid())`,

    // Stores
    `CREATE POLICY "ps_select" ON public_stores FOR SELECT USING (true)`,
    `CREATE POLICY "ps_manage" ON public_stores FOR ALL USING (user_id = auth.uid())`,
    `CREATE POLICY "sp_select" ON store_products FOR SELECT USING (true)`,
    `CREATE POLICY "sp_manage" ON store_products FOR ALL USING (
      store_id IN (SELECT id FROM public_stores WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "so_all" ON store_orders FOR ALL USING (
      user_id = auth.uid() OR store_id IN (SELECT id FROM public_stores WHERE user_id = auth.uid())
    )`,

    // Global read tables
    `CREATE POLICY "gs_select" ON global_settings FOR SELECT USING (true)`,
    `CREATE POLICY "gs_manage" ON global_settings FOR ALL USING (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin')
    )`,
    `CREATE POLICY "tpl_select" ON templates FOR SELECT USING (true)`,
    `CREATE POLICY "tpl_manage" ON templates FOR ALL USING (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin')
    )`,
    `CREATE POLICY "cl_select" ON changelog FOR SELECT USING (true)`,
    `CREATE POLICY "cc_select" ON custom_components FOR SELECT USING (true)`,
    `CREATE POLICY "cc_manage" ON custom_components FOR ALL USING (user_id = auth.uid())`,
    `CREATE POLICY "pr_select" ON prompts FOR SELECT USING (true)`,
    `CREATE POLICY "pr_manage" ON prompts FOR ALL USING (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('superadmin', 'owner', 'admin')
    )`,
    `CREATE POLICY "ti_select" ON tenant_invites FOR SELECT USING (
      tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
    )`,
    `CREATE POLICY "ti_manage" ON tenant_invites FOR ALL USING (
      tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    )`,
    `CREATE POLICY "aa_all" ON agency_activity FOR ALL USING (
      agency_tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    )`,
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
      // Only log CREATE/ALTER/DROP, skip simple ones
      const label = sql.substring(0, 60).replace(/\n/g, ' ');
      console.log(`  ✅ ${label}...`);
    } catch (err) {
      console.error(`  ❌ ${sql.substring(0, 60)}: ${err.message}`);
    }
  }

  await client.end();
  console.log('\n  Schema fixed!\n');
}

// ============================================================
// STEP 2: Re-run migration (same as before)
// ============================================================

function sanitizeData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (obj._path && obj._converter !== undefined) return obj.path;
  if (Array.isArray(obj)) return obj.map(sanitizeData);
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeData(value);
  }
  return result;
}

async function runMigration() {
  console.log('🔥 STEP 2: Re-running Firestore → Supabase migration...\n');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: FIREBASE_PROJECT_ID,
    });
  }
  const firestore = admin.firestore();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get Supabase owner ID
  const { data: authData } = await supabase.auth.admin.listUsers();
  const owner = authData.users.find(u => u.email === OWNER_EMAIL);
  if (!owner) { console.error('❌ Owner not found'); process.exit(1); }
  const OWNER_ID = owner.id;
  console.log(`  Owner: ${owner.email} → ${OWNER_ID}`);

  // Find Firebase owner UID
  const usersSnap = await firestore.collection('users').get();
  let firebaseUID = null;
  for (const doc of usersSnap.docs) {
    const d = doc.data();
    if (d.email === OWNER_EMAIL || d.role === 'owner') {
      firebaseUID = doc.id;
      break;
    }
  }
  console.log(`  Firebase UID: ${firebaseUID}`);

  async function upsert(table, rows, conflict = 'id') {
    if (rows.length === 0) return 0;
    let ok = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict });
      if (error) {
        // Try one by one
        for (const row of chunk) {
          const { error: e2 } = await supabase.from(table).upsert([row], { onConflict: conflict, ignoreDuplicates: true });
          if (!e2) ok++;
        }
      } else {
        ok += chunk.length;
      }
    }
    return ok;
  }

  // --- Users ---
  const ownerData = usersSnap.docs.find(d => d.id === firebaseUID)?.data();
  await upsert('users', [{
    id: OWNER_ID,
    email: OWNER_EMAIL,
    role: 'owner',
    data: sanitizeData(ownerData || {}),
  }]);
  console.log('  ✅ Users');

  // --- Global Settings ---
  const gsSnap = await firestore.collection('globalSettings').get();
  const gsRows = gsSnap.docs.map(d => ({ id: d.id, data: sanitizeData(d.data()) }));
  try {
    const settSnap = await firestore.collection('settings').get();
    settSnap.docs.forEach(d => { if (!gsRows.find(r => r.id === d.id)) gsRows.push({ id: d.id, data: sanitizeData(d.data()) }); });
  } catch(e) {}
  await upsert('global_settings', gsRows);
  console.log(`  ✅ Global Settings: ${gsRows.length}`);

  // --- Templates ---
  const tplSnap = await firestore.collection('templates').get();
  await upsert('templates', tplSnap.docs.map(d => ({ id: d.id, data: sanitizeData(d.data()) })));
  console.log(`  ✅ Templates: ${tplSnap.size}`);

  // --- Tenants ---
  const tenantsSnap = await firestore.collection('tenants').get();
  await upsert('tenants', tenantsSnap.docs.map(d => ({
    id: d.id, owner_id: OWNER_ID, data: sanitizeData(d.data()),
  })));
  // Also create personal tenant with new UID
  const personalTenantId = `tenant_${OWNER_ID}`;
  await upsert('tenants', [{
    id: personalTenantId, owner_id: OWNER_ID,
    data: { id: personalTenantId, name: 'Mi Workspace', type: 'personal', planId: 'premium', ownerUserId: OWNER_ID, createdAt: new Date().toISOString() },
  }]);
  console.log(`  ✅ Tenants: ${tenantsSnap.size + 1}`);

  // --- Tenant Members (for all tenants) ---
  const allTenantIds = [...tenantsSnap.docs.map(d => d.id), personalTenantId];
  const tmRows = allTenantIds.map(tid => ({
    id: `${tid}_${OWNER_ID}`,
    tenant_id: tid,
    user_id: OWNER_ID,
    role: 'owner',
    data: { tenantId: tid, userId: OWNER_ID, role: 'owner', joinedAt: new Date().toISOString() },
  }));
  await upsert('tenant_members', tmRows);
  console.log(`  ✅ Tenant Members: ${tmRows.length}`);

  // --- Projects ---
  let totalProj = 0;
  if (firebaseUID) {
    const projSnap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    const projRows = projSnap.docs.map(d => ({
      id: d.id, user_id: OWNER_ID, data: sanitizeData(d.data()),
    }));
    await upsert('projects', projRows);
    totalProj += projRows.length;
  }
  // Tenant projects
  for (const tDoc of tenantsSnap.docs) {
    try {
      const tpSnap = await firestore.collection(`tenants/${tDoc.id}/projects`).get();
      if (tpSnap.size > 0) {
        await upsert('projects', tpSnap.docs.map(d => ({
          id: d.id, user_id: OWNER_ID, data: { ...sanitizeData(d.data()), tenantId: tDoc.id },
        })));
        totalProj += tpSnap.size;
      }
    } catch(e) {}
  }
  console.log(`  ✅ Projects: ${totalProj}`);

  // --- Project subcollections ---
  if (firebaseUID) {
    const projSnap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    const subMap = [
      { fs: 'leads', sb: 'project_leads' },
      { fs: 'files', sb: 'project_files' },
      { fs: 'appointments', sb: 'project_appointments' },
      { fs: 'posts', sb: 'project_posts' },
      { fs: 'finance', sb: 'project_finance' },
    ];
    for (const proj of projSnap.docs) {
      for (const { fs, sb } of subMap) {
        try {
          const subSnap = await firestore.collection(`users/${firebaseUID}/projects/${proj.id}/${fs}`).get();
          if (subSnap.size > 0) {
            await upsert(sb, subSnap.docs.map(d => ({
              id: d.id, project_id: proj.id, data: sanitizeData(d.data()),
            })));
          }
        } catch(e) {}
      }
    }
    console.log(`  ✅ Project subcollections migrated`);
  }

  // --- Domains ---
  try {
    const domSnap = await firestore.collection('customDomains').get();
    if (domSnap.size > 0) {
      await upsert('custom_domains', domSnap.docs.map(d => ({
        domain_name: d.id, user_id: OWNER_ID, data: sanitizeData(d.data()),
      })), 'domain_name');
    }
    console.log(`  ✅ Domains: ${domSnap.size}`);
  } catch(e) {}

  try {
    const subSnap = await firestore.collection('subdomains').get();
    if (subSnap.size > 0) {
      await upsert('subdomains', subSnap.docs.map(d => ({
        subdomain_name: d.id, user_id: OWNER_ID, data: sanitizeData(d.data()),
      })), 'subdomain_name');
    }
    console.log(`  ✅ Subdomains: ${subSnap.size}`);
  } catch(e) {}

  // --- Changelog, Prompts, Custom Components ---
  for (const [fsCol, sbTable, hasUser] of [['changelog', 'changelog', false], ['prompts', 'prompts', false], ['customComponents', 'custom_components', true]]) {
    try {
      const snap = await firestore.collection(fsCol).get();
      if (snap.size > 0) {
        await upsert(sbTable, snap.docs.map(d => ({
          id: d.id,
          ...(hasUser ? { user_id: OWNER_ID } : {}),
          data: sanitizeData(d.data()),
        })));
        console.log(`  ✅ ${sbTable}: ${snap.size}`);
      }
    } catch(e) {}
  }

  // --- Public Stores ---
  try {
    const storesSnap = await firestore.collection('publicStores').get();
    if (storesSnap.size > 0) {
      await upsert('public_stores', storesSnap.docs.map(d => ({
        id: d.id, user_id: OWNER_ID, data: sanitizeData(d.data()),
      })));
      console.log(`  ✅ Public Stores: ${storesSnap.size}`);
    }
  } catch(e) {}

  // Store products from user subcollections
  if (firebaseUID) {
    try {
      const storesSnap = await firestore.collection(`users/${firebaseUID}/stores`).get();
      for (const storeDoc of storesSnap.docs) {
        await upsert('public_stores', [{ id: storeDoc.id, user_id: OWNER_ID, data: sanitizeData(storeDoc.data()) }]);
        try {
          const prodSnap = await firestore.collection(`users/${firebaseUID}/stores/${storeDoc.id}/products`).get();
          if (prodSnap.size > 0) {
            await upsert('store_products', prodSnap.docs.map(d => ({
              id: d.id, store_id: storeDoc.id, data: sanitizeData(d.data()),
            })));
          }
        } catch(e) {}
      }
      console.log(`  ✅ User stores: ${storesSnap.size}`);
    } catch(e) {}
  }

  console.log('\n============================================================');
  console.log('  ✅ MIGRATION COMPLETE!');
  console.log('============================================================');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('  FIX SCHEMA + RE-MIGRATE FIRESTORE → SUPABASE');
  console.log('============================================================');

  await fixSchema();
  await runMigration();
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
