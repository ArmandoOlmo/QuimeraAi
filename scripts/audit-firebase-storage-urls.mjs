#!/usr/bin/env node
/**
 * Audit Firebase Storage URLs still present in Supabase projects.
 * Also looks for `firebasestorage.googleapis.com` mentions to estimate
 * how many images need to be migrated.
 */
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const requireFromQuimera = createRequire(resolve(ROOT, 'QuimeraAi', 'package.json'));
const { createClient } = requireFromQuimera('@supabase/supabase-js');

const SUPABASE_URL = 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function findFirebaseUrls(obj, urls = new Set()) {
  if (!obj) return urls;
  if (typeof obj === 'string') {
    if (obj.includes('firebasestorage.googleapis.com') || obj.includes('firebasestorage.app')) {
      urls.add(obj);
    }
    return urls;
  }
  if (typeof obj !== 'object') return urls;
  if (Array.isArray(obj)) {
    obj.forEach((v) => findFirebaseUrls(v, urls));
    return urls;
  }
  Object.values(obj).forEach((v) => findFirebaseUrls(v, urls));
  return urls;
}

async function main() {
  // Tables that contain user-generated content with file URLs.
  const tables = [
    'projects',
    'project_files',
    'project_posts',
    'project_leads',
    'public_stores',
    'store_products',
    'store_categories',
    'global_settings',
    'templates',
    'custom_components',
  ];

  let grandTotalUrls = 0;
  const projectsByUserWithUrls = new Map();

  for (const table of tables) {
    console.log(`\n=== Table: ${table} ===`);
    let allRows = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1);
      if (error) {
        console.log(`  ⚠️  Error reading ${table}: ${error.message}`);
        break;
      }
      allRows.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    console.log(`  Rows: ${allRows.length}`);

    let rowsWithUrls = 0;
    let totalUrls = 0;
    const sample = [];
    for (const row of allRows) {
      const urls = findFirebaseUrls(row);
      if (urls.size > 0) {
        rowsWithUrls++;
        totalUrls += urls.size;
        if (sample.length < 3) sample.push({ id: row.id, urlCount: urls.size, first: [...urls][0]?.slice(0, 120) });
        if (table === 'projects') {
          const uid = row.user_id;
          if (!projectsByUserWithUrls.has(uid)) projectsByUserWithUrls.set(uid, { count: 0, urls: 0 });
          const s = projectsByUserWithUrls.get(uid);
          s.count += 1;
          s.urls += urls.size;
        }
      }
    }
    console.log(`  Rows with Firebase URLs: ${rowsWithUrls}`);
    console.log(`  Total Firebase URLs found: ${totalUrls}`);
    if (sample.length) {
      console.log('  Samples:');
      sample.forEach((s) => console.log(`    - id=${s.id} | urls=${s.urlCount} | ${s.first}`));
    }
    grandTotalUrls += totalUrls;
  }

  console.log('\n=== Projects: Firebase URLs by user ===');
  for (const [uid, s] of projectsByUserWithUrls.entries()) {
    console.log(`  ${uid}: ${s.count} projects | ${s.urls} URLs`);
  }
  console.log(`\nGRAND TOTAL Firebase URLs still in Supabase: ${grandTotalUrls}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
