#!/usr/bin/env node
/**
 * FIRESTORE → SUPABASE MIGRATION SCRIPT FOR SIXTO MEDIA
 * Migrates tenant, subscription, and projects for sixtomedia@gmail.com
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-sixtomedia.mjs
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TARGET_EMAIL = 'sixtomedia@gmail.com';
const FIREBASE_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';
const FIREBASE_TENANT_ID = 'tenant_JQCYR5RSx0UZo9atof9VbEWP0w83';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required. Set it as an env variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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

async function main() {
  console.log(`🔍 Migrating data for ${TARGET_EMAIL}...`);

  // 1. Get Supabase User ID
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  
  const targetUser = usersData.users.find(u => u.email === TARGET_EMAIL);
  if (!targetUser) {
    console.error('❌ User not found in Supabase Auth. Has Sixto Media logged in recently?');
    process.exit(1);
  }
  const supabaseUserId = targetUser.id;
  console.log(`✅ Found Supabase User ID: ${supabaseUserId}`);

  // 2. Find their newly created empty tenant (if any) to avoid duplicates
  // The system auto-created a personal workspace for them when they logged in
  const { data: existingMembers } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', supabaseUserId);

  let newTenantIdToUse = null;
  if (existingMembers && existingMembers.length > 0) {
    newTenantIdToUse = existingMembers[0].tenant_id;
    console.log(`✅ Found existing Supabase Tenant ID: ${newTenantIdToUse}`);
  } else {
    newTenantIdToUse = crypto.randomUUID();
    console.log(`⚠️ No existing tenant found, generating new one: ${newTenantIdToUse}`);
  }

  // 3. Fetch original Firestore tenant
  const tenantSnap = await firestore.collection('tenants').doc(FIREBASE_TENANT_ID).get();
  if (!tenantSnap.exists) {
    console.error('❌ Firestore tenant not found!');
    process.exit(1);
  }
  const tenantData = sanitizeData(tenantSnap.data());
  console.log(`✅ Fetched Firestore Tenant. Original plan: ${tenantData.subscriptionPlan}`);

  // 4. Update/Insert Tenant in Supabase with original data but new ID
  // We keep the old data (limits, branding, name) but tie it to their new Supabase identity
  const supabaseTenantRecord = {
    id: newTenantIdToUse,
    owner_user_id: supabaseUserId,
    subscription_plan: tenantData.subscriptionPlan || 'agency_starter',
    name: tenantData.name,
    slug: tenantData.slug,
    type: tenantData.type || 'personal',
    status: tenantData.status || 'active',
    limits: tenantData.limits || {},
    usage: tenantData.usage || {},
    branding: tenantData.branding || {},
    settings: tenantData.settings || {}
  };

  const { error: tenantUpsertErr } = await supabase
    .from('tenants')
    .upsert(supabaseTenantRecord);
  if (tenantUpsertErr) throw tenantUpsertErr;
  console.log('✅ Updated Supabase Tenant with legacy data.');

  // Ensure they are a member
  const { error: memberErr } = await supabase
    .from('tenant_members')
    .upsert({
      id: `${newTenantIdToUse}_${supabaseUserId}`,
      tenant_id: newTenantIdToUse,
      user_id: supabaseUserId,
      role: 'agency_owner',
      permissions: { canManageSettings: true, canInviteMembers: true, canRemoveMembers: true }
    });
  if (memberErr) throw memberErr;
  console.log('✅ Updated Tenant Membership.');

  // 5. Create Subscription in Supabase
  const subscriptionRecord = {
    tenant_id: newTenantIdToUse,
    plan_id: tenantData.subscriptionPlan || 'agency_starter',
    status: 'active',
    billing_cycle: 'monthly',
    start_date: new Date().toISOString(),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    cancel_at_period_end: false,
    add_ons: [],
    credit_packages_purchased: [],
    ai_credits_usage: {
        total_used: 0,
        services: {},
        last_reset: new Date().toISOString(),
        current_period_start: new Date().toISOString()
    }
  };

  const { error: subErr } = await supabase
    .from('subscriptions')
    .upsert(subscriptionRecord);
  if (subErr) throw subErr;
  console.log('✅ Created Supabase Subscription record (agency_starter).');

  // 6. Migrate Projects
  console.log(`🔍 Fetching legacy projects from Firestore...`);
  const projectsSnap = await firestore.collection(`users/${FIREBASE_UID}/projects`).get();
  if (projectsSnap.size > 0) {
    const projectsRows = projectsSnap.docs.map(doc => {
      return {
        id: doc.id,
        user_id: supabaseUserId,
        data: sanitizeData(doc.data())
      };
    });
    
    // We insert the projects
    const { error: projErr } = await supabase
        .from('projects')
        .upsert(projectsRows, { ignoreDuplicates: false });
    if (projErr) throw projErr;
    console.log(`✅ Migrated ${projectsRows.length} projects to Supabase.`);
  } else {
    console.log('⚠️ No legacy projects found.');
  }

  console.log('🎉 Migration for Sixto Media complete! They should now see their Agency plan and projects.');
}

main().catch(console.error);
