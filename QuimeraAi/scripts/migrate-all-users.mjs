#!/usr/bin/env node
/**
 * FIRESTORE → SUPABASE FULL USERS MIGRATION SCRIPT
 */

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const uidMap = new Map();
const projectIdMap = new Map();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required.');
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

async function upsertBatch(table, rows, conflictColumn = 'id') {
  if (rows.length === 0) return 0;
  const CHUNK_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictColumn, ignoreDuplicates: false });
    if (error) {
      console.error(`  ❌ Error upserting into ${table}:`, error.message);
      for (const row of chunk) {
        const { error: singleError } = await supabase.from(table).upsert([row], { onConflict: conflictColumn, ignoreDuplicates: true });
        if (singleError) console.error(`    ❌ Row ${row.id}: ${singleError.message}`);
        else inserted++;
      }
    } else {
      inserted += chunk.length;
    }
  }
  return inserted;
}

async function fetchSupabaseUsers() {
  console.log('\n🔍 Fetching existing Supabase auth users...');
  let allUsers = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    allUsers.push(...data.users);
    if (data.users.length < 1000) hasMore = false;
    page++;
  }
  const emailToIdMap = new Map();
  allUsers.forEach(u => {
    if (u.email) emailToIdMap.set(u.email.toLowerCase(), u.id);
  });
  return emailToIdMap;
}

async function migrateAuthUsers() {
  console.log('\n🔍 Migrating Firebase Auth...');
  const existingSupabaseUsers = await fetchSupabaseUsers();
  const usersSnap = await firestore.collection('users').get();
  const allFirebaseUIDs = [];
  let createdCount = 0;
  let mappedCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const email = data.email;
    const firebaseUID = doc.id;
    allFirebaseUIDs.push(firebaseUID);
    if (!email) continue;
    
    const emailLower = email.toLowerCase();
    if (existingSupabaseUsers.has(emailLower)) {
      uidMap.set(firebaseUID, existingSupabaseUsers.get(emailLower));
      mappedCount++;
    } else {
      const randomPassword = Math.random().toString(36).slice(-8) + 'aA1!';
      const { data: newUser, error } = await supabase.auth.admin.createUser({ email, password: randomPassword, email_confirm: true });
      if (!error && newUser.user) {
        uidMap.set(firebaseUID, newUser.user.id);
        createdCount++;
      }
    }
  }
  console.log(`  ✅ Mapped: ${mappedCount}, Created: ${createdCount}`);
  return allFirebaseUIDs;
}

async function migratePublicUsers(firebaseUIDs) {
  console.log('\n📋 Migrating public.users...');
  const usersSnap = await firestore.collection('users').get();
  const rows = [];
  for (const doc of usersSnap.docs) {
    const data = sanitizeData(doc.data());
    const supabaseId = uidMap.get(doc.id);
    if (!supabaseId) continue;
    rows.push({
      id: supabaseId,
      email: data.email || '',
      role: data.role || 'user',
      name: data.displayName || data.name || '',
      photo_url: data.photoURL || data.photoUrl || '',
      preferences: data.preferences || {},
      onboarding_state: data.onboardingState || data.onboarding_state || {},
      job_title: data.jobTitle || '',
      bio: data.bio || '',
      phone: data.phone || '',
      department: data.department || '',
    });
  }
  const count = await upsertBatch('users', rows);
  console.log(`  ✅ Migrated ${count} rows`);
}

async function migrateProjects(firebaseUIDs) {
  console.log('\n📋 Migrating projects...');
  let totalProjects = 0;
  for (const firebaseUID of firebaseUIDs) {
    const supabaseId = uidMap.get(firebaseUID);
    if (!supabaseId) continue;
    const snap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    if (snap.size > 0) {
      const rows = snap.docs.map(doc => {
        const newProjectId = crypto.randomUUID();
        projectIdMap.set(doc.id, newProjectId);
        const data = sanitizeData(doc.data());
        return {
          id: newProjectId,
          user_id: supabaseId,
          name: data.name || 'Untitled',
          status: data.status || 'Draft',
          data: data
        };
      });
      const count = await upsertBatch('projects', rows);
      totalProjects += count;
    }
  }
  console.log(`  ✅ Total projects migrated: ${totalProjects}`);
}

async function migrateProjectSubcollections(firebaseUIDs) {
  console.log('\n📋 Migrating project subcollections...');
  const subcollectionMap = [
    { firestore: 'leads', supabase: 'project_leads', fk: 'project_id' },
    { firestore: 'files', supabase: 'project_files', fk: 'project_id' },
    { firestore: 'appointments', supabase: 'project_appointments', fk: 'project_id' },
    { firestore: 'posts', supabase: 'project_posts', fk: 'project_id' },
    { firestore: 'finance', supabase: 'project_finance', fk: 'project_id' },
  ];
  for (const firebaseUID of firebaseUIDs) {
    const projectsSnap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    for (const projectDoc of projectsSnap.docs) {
      const newProjectId = projectIdMap.get(projectDoc.id);
      if (!newProjectId) continue;
      for (const { firestore: fsCollection, supabase: sbTable, fk } of subcollectionMap) {
        try {
          const subSnap = await firestore.collection(`users/${firebaseUID}/projects/${projectDoc.id}/${fsCollection}`).get();
          if (subSnap.size > 0) {
            const rows = subSnap.docs.map(doc => ({
              id: doc.id,
              [fk]: newProjectId,
              data: sanitizeData(doc.data()),
            }));
            await upsertBatch(sbTable, rows);
          }
        } catch (e) {}
      }
    }
  }
  console.log(`  ✅ Project subcollections migrated`);
}

async function migrateEmailMarketing(firebaseUIDs) {
  console.log('\n📋 Migrating email marketing data...');
  for (const firebaseUID of firebaseUIDs) {
    const supabaseId = uidMap.get(firebaseUID);
    if (!supabaseId) continue;
    const projectsSnap = await firestore.collection(`users/${firebaseUID}/projects`).get();
    for (const projectDoc of projectsSnap.docs) {
      const newProjectId = projectIdMap.get(projectDoc.id);
      if (!newProjectId) continue;

      // Email Audiences
      try {
        const snap = await firestore.collection(`users/${firebaseUID}/projects/${projectDoc.id}/emailAudiences`).get();
        if (snap.size > 0) {
          const rows = snap.docs.map(doc => {
            const data = sanitizeData(doc.data());
            return {
              id: crypto.randomUUID(),
              store_id: newProjectId,
              name: data.name || 'Untitled',
              description: data.description || null,
              filters: data.filters || [],
              accepts_marketing: data.acceptsMarketing ?? null,
              has_ordered: data.hasOrdered ?? null,
              min_orders: data.minOrders ?? null,
              max_orders: data.maxOrders ?? null,
              min_total_spent: data.minTotalSpent ?? null,
              max_total_spent: data.maxTotalSpent ?? null,
              tags: data.tags || [],
              exclude_tags: data.excludeTags || [],
              last_order_days_ago: data.lastOrderDaysAgo ?? null,
              source: data.source || null,
              static_members: data.staticMembers || [],
              static_member_count: data.staticMemberCount ?? 0,
              estimated_count: data.estimatedCount ?? 0,
              last_count_update: data.lastCountUpdate || null,
              is_default: data.isDefault ?? false,
              created_by: supabaseId
            };
          });
          await upsertBatch('email_audiences', rows);
        }
      } catch (e) {}

      // Email Campaigns
      try {
        const snap = await firestore.collection(`users/${firebaseUID}/projects/${projectDoc.id}/emailCampaigns`).get();
        if (snap.size > 0) {
          const rows = snap.docs.map(doc => {
            const data = sanitizeData(doc.data());
            return {
              id: crypto.randomUUID(),
              store_id: newProjectId,
              name: data.name || 'Untitled',
              subject: data.subject || null,
              preview_text: data.previewText || null,
              type: data.type || 'regular',
              html_content: data.htmlContent || null,
              email_document: data.emailDocument || null,
              audience_type: data.audienceType || null,
              audience_segment_id: data.audienceSegmentId || null,
              custom_recipient_emails: data.customRecipientEmails || [],
              status: data.status || 'draft',
              stats: data.stats || {},
              tags: data.tags || [],
              created_by: supabaseId
            };
          });
          await upsertBatch('email_campaigns', rows);
        }
      } catch (e) {}

      // Email Automations
      try {
        const snap = await firestore.collection(`users/${firebaseUID}/projects/${projectDoc.id}/emailAutomations`).get();
        if (snap.size > 0) {
          const rows = snap.docs.map(doc => {
            const data = sanitizeData(doc.data());
            return {
              id: crypto.randomUUID(),
              store_id: newProjectId,
              name: data.name || 'Untitled',
              description: data.description || null,
              type: data.type || null,
              category: data.category || null,
              status: data.status || 'draft',
              trigger_config: data.triggerConfig || {},
              audience_id: data.audienceId || null,
              steps: data.steps || [],
              template_id: data.templateId || null,
              subject: data.subject || null,
              delay_minutes: data.delayMinutes ?? 0,
              stats: data.stats || {}
            };
          });
          await upsertBatch('email_automations', rows);
        }
      } catch (e) {}

      // Email Logs
      try {
        const snap = await firestore.collection(`users/${firebaseUID}/projects/${projectDoc.id}/emailLogs`).get();
        if (snap.size > 0) {
          const rows = snap.docs.map(doc => {
            const data = sanitizeData(doc.data());
            return {
              id: crypto.randomUUID(),
              store_id: newProjectId,
              type: data.type || null,
              template_id: data.templateId || null,
              campaign_id: data.campaignId || null,
              recipient_email: data.recipientEmail || null,
              recipient_name: data.recipientName || null,
              customer_id: data.customerId || null,
              subject: data.subject || null,
              status: data.status || null,
              provider_message_id: data.providerMessageId || null,
              provider: data.provider || null,
              open_count: data.openCount ?? 0,
              click_count: data.clickCount ?? 0,
              bounce_type: data.bounceType || null,
              bounce_message: data.bounceMessage || null,
              error_message: data.errorMessage || null,
              error_code: data.errorCode || null,
              order_id: data.orderId || null,
              lead_id: data.leadId || null,
              metadata: data.metadata || {},
              sent_at: data.sentAt || null,
              delivered_at: data.deliveredAt || null,
              opened_at: data.openedAt || null,
              clicked_links: data.clickedLinks || {},
              clicked_at: data.clickedAt || null,
              bounced_at: data.bouncedAt || null,
              complained_at: data.complainedAt || null
            };
          });
          await upsertBatch('email_logs', rows);
        }
      } catch (e) {}
    }
  }
}

// Just map Ecommerce public stores
async function migrateEcommerce(firebaseUIDs) {
  console.log('\n📋 Migrating e-commerce data...');
  for (const firebaseUID of firebaseUIDs) {
    const supabaseId = uidMap.get(firebaseUID);
    if (!supabaseId) continue;
    try {
      const storesSnap = await firestore.collection(`users/${firebaseUID}/stores`).get();
      if (storesSnap.size > 0) {
        const storeRows = storesSnap.docs.map(doc => ({
          id: doc.id, // public_stores.id is text
          user_id: supabaseId,
          data: sanitizeData(doc.data()),
        }));
        await upsertBatch('public_stores', storeRows);
        
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
              const subSnap = await firestore.collection(`users/${firebaseUID}/stores/${storeDoc.id}/${name}`).get();
              if (subSnap.size > 0) {
                const rows = subSnap.docs.map(doc => ({
                  id: doc.id,
                  store_id: storeDoc.id,
                  ...(table === 'store_orders' ? { user_id: supabaseId } : {}),
                  data: sanitizeData(doc.data()),
                }));
                await upsertBatch(table, rows);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }
}

async function main() {
  const firebaseUIDs = await migrateAuthUsers();
  await migratePublicUsers(firebaseUIDs);
  await migrateProjects(firebaseUIDs);
  await migrateProjectSubcollections(firebaseUIDs);
  await migrateEmailMarketing(firebaseUIDs);
  await migrateEcommerce(firebaseUIDs);
  console.log('\n✅ DONE');
}

main().catch(console.error);
