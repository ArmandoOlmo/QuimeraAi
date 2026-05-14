#!/usr/bin/env node

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const FIREBASE_PROJECT_ID = 'quimeraai';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

// Simple deterministic UUID from string (v5-like)
function generateDeterministicUUID(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

async function main() {
  console.log(`🔍 Migrating legacy projects for ${TARGET_EMAIL}...`);

  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  
  const targetUser = usersData.users.find(u => u.email === TARGET_EMAIL);
  if (!targetUser) throw new Error('User not found in Supabase Auth.');
  const supabaseUserId = targetUser.id;
  
  const { data: existingMembers } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', supabaseUserId);
  const tenantId = existingMembers[0].tenant_id;

  const projectsSnap = await firestore.collection(`users/${FIREBASE_UID}/projects`).get();
  if (projectsSnap.size > 0) {
    const projectsRows = projectsSnap.docs.map(doc => {
      const data = sanitizeData(doc.data());
      // Generate a UUID from the legacy ID so it's deterministic and doesn't duplicate if run twice
      const newId = generateDeterministicUUID(doc.id);
      
      // Update the internal ID reference as well!
      data.id = newId;
      data.legacyId = doc.id;
      
      let projectName = data.name;
      if (typeof projectName === 'object') {
        projectName = projectName.es || projectName.en || 'Untitled';
      }

      return {
        id: newId,
        user_id: supabaseUserId,
        tenant_id: tenantId,
        name: projectName + ' (Restored)',
        status: data.status || 'Draft',
        data: data
      };
    });
    
    for (const row of projectsRows) {
        console.log(`- Upserting ${row.name} (legacy: ${row.data.legacyId} -> new: ${row.id})`);
    }

    const { error: projErr } = await supabase
        .from('projects')
        .upsert(projectsRows, { ignoreDuplicates: false });
    if (projErr) throw projErr;
    console.log(`✅ Migrated ${projectsRows.length} legacy projects to Supabase.`);
  } else {
    console.log('⚠️ No legacy projects found.');
  }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
