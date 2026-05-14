#!/usr/bin/env node
/** Verify the post-rescue state of sixtomedia in Supabase. */
import { createRequire } from 'module';
import { resolve } from 'path';
const requireFromQuimera = createRequire(resolve('./QuimeraAi', 'package.json'));
const { createClient } = requireFromQuimera('@supabase/supabase-js');

const SUPABASE_URL = 'https://elfcrnhffuvntlfuvumd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, KEY);

const SIXTO_SB_ID = '26d2676a-4a96-40cd-ae0a-9e6a863fa601';
const SIXTO_TENANT_ID = '54c81627-758e-4aae-9dce-5695098426e5';
const SIXTO_PROJECTS = [
  '00000000-0000-4000-a000-00006cc19712',
  '00000000-0000-4000-a000-00004ca8a628',
  '00000000-0000-4000-a000-000077fe8171',
];

function countFirebaseUrls(obj, c = { count: 0 }) {
  if (!obj) return c;
  if (typeof obj === 'string') {
    if (obj.includes('firebasestorage.googleapis.com') ||
        obj.includes('firebasestorage.app/') ||
        obj.includes('storage.googleapis.com/quimeraai') ||
        obj.startsWith('gs://quimeraai')) {
      c.count++;
    }
    return c;
  }
  if (typeof obj !== 'object') return c;
  if (Array.isArray(obj)) { obj.forEach(v => countFirebaseUrls(v, c)); return c; }
  Object.values(obj).forEach(v => countFirebaseUrls(v, c));
  return c;
}

async function main() {
  console.log('============================================================');
  console.log('  VERIFY sixtomedia state');
  console.log('============================================================\n');

  // Projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, data, last_updated')
    .eq('user_id', SIXTO_SB_ID);
  console.log('PROJECTS (' + projects.length + '):');
  projects.forEach(p => {
    const urls = countFirebaseUrls(p.data || {}).count;
    const keys = Object.keys(p.data || {}).length;
    const isDeleted = !!(p.data?.deletedAt || p.data?.isDeleted);
    console.log(`  ${p.id} | "${p.name}" | keys=${keys} | size=${JSON.stringify(p.data).length}B | fbUrls=${urls} | deleted=${isDeleted}`);
  });

  // Posts
  for (const pid of SIXTO_PROJECTS) {
    const projectTag = `project:${pid}`;
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, status, tags, featured_image')
      .contains('tags', [projectTag])
      .eq('tenant_id', SIXTO_TENANT_ID);
    const { count: pCount } = await supabase
      .from('project_posts')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', pid);
    console.log(`\nPOSTS for ${pid}: posts.tag=${posts?.length || 0} | project_posts=${pCount}`);
    posts?.slice(0, 3).forEach(p => console.log(`  - "${p.title?.slice(0, 60)}" | status=${p.status} | featured_image="${p.featured_image}"`));
  }

  // Leads
  console.log('\nLEADS by project:');
  for (const pid of SIXTO_PROJECTS) {
    const { data: leads } = await supabase.from('leads').select('id, name, email, status').eq('project_id', pid);
    console.log(`  ${pid}: ${leads?.length || 0} leads`);
    leads?.forEach(l => console.log(`    - ${l.name} (${l.email}) | ${l.status}`));
  }

  // Appointments
  console.log('\nAPPOINTMENTS by project:');
  for (const pid of SIXTO_PROJECTS) {
    const { data: appts } = await supabase.from('project_appointments').select('id, title, status, start_date').eq('project_id', pid);
    console.log(`  ${pid}: ${appts?.length || 0} appointments`);
    appts?.forEach(a => console.log(`    - ${a.title} | ${a.status} | ${a.start_date}`));
  }

  // Public stores
  const { data: stores } = await supabase.from('public_stores').select('id, data').eq('user_id', SIXTO_SB_ID);
  console.log('\nSTORES:');
  stores?.forEach(s => {
    const urls = countFirebaseUrls(s.data || {}).count;
    console.log(`  ${s.id} | name="${s.data?.name}" | fbUrls=${urls}`);
  });

  // Store products
  const { data: products } = await supabase.from('store_products').select('id, store_id, data').in('store_id', ['proj_1770735363583']);
  console.log('\nSTORE PRODUCTS:');
  products?.forEach(p => {
    const urls = countFirebaseUrls(p.data || {}).count;
    console.log(`  ${p.id} | name="${p.data?.name}" | fbUrls=${urls}`);
  });

  // Domains
  const { data: doms } = await supabase.from('custom_domains').select('domain_name, project_id, status').eq('user_id', SIXTO_SB_ID);
  console.log('\nDOMAINS:');
  doms?.forEach(d => console.log(`  ${d.domain_name} | project_id=${d.project_id} | status=${d.status}`));

  // Total Firebase URLs remaining anywhere
  console.log('\n=== Final Firebase URLs check ===');
  let totalRemaining = 0;
  for (const pid of SIXTO_PROJECTS) {
    const { data } = await supabase.from('projects').select('data').eq('id', pid).single();
    const n = countFirebaseUrls(data.data).count;
    totalRemaining += n;
    if (n > 0) console.log(`  ⚠️  project ${pid}: ${n} URLs remain`);
  }
  console.log(`  Projects total: ${totalRemaining}`);
}

main().catch(e => { console.error(e); process.exit(1); });
