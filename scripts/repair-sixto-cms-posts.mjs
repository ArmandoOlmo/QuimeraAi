#!/usr/bin/env node
/**
 * Repair sixtomedia CMS posts whose Supabase `posts.content` was emptied by
 * the earlier Firebase URL stripper.
 *
 * Default mode is --dry-run. Use --apply with SUPABASE_SERVICE_ROLE_KEY to
 * update Supabase.
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
const SLUG_FILTER = process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length);
const PROJECT_FILTER = process.argv.find((arg) => arg.startsWith('--project='))?.slice('--project='.length);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const FIREBASE_PROJECT_ID = 'quimeraai';
const SIXTO_FB_UID = 'JQCYR5RSx0UZo9atof9VbEWP0w83';
const SIXTO_SB_ID = '26d2676a-4a96-40cd-ae0a-9e6a863fa601';
const SIXTO_TENANT_ID = '54c81627-758e-4aae-9dce-5695098426e5';

const PROJECT_MAPPING = {
  proj_1770495785601: '00000000-0000-4000-a000-00006cc19712',
  proj_1770735363583: '00000000-0000-4000-a000-00004ca8a628',
  proj_1775662000599: '00000000-0000-4000-a000-000077fe8171',
};

if (APPLY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required for --apply.');
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}

const firestore = admin.firestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isFirebaseStorageUrl(s) {
  return typeof s === 'string' && (
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
  if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
    return new Date(obj._seconds * 1000).toISOString();
  }
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined && Object.keys(obj).length === 2) {
    return new Date(obj.seconds * 1000).toISOString();
  }
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (typeof obj.toMillis === 'function') return new Date(obj.toMillis()).toISOString();
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

async function fetchCurrentPosts(ids) {
  const current = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content, tags')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) current.set(row.id, row);
  }
  return current;
}

async function main() {
  console.log('============================================================');
  console.log(`  REPAIR sixtomedia CMS posts [${APPLY ? 'APPLY' : 'DRY-RUN'}]`);
  console.log('============================================================');

  const candidates = [];

  for (const [fbProjectId, sbProjectId] of Object.entries(PROJECT_MAPPING)) {
    if (PROJECT_FILTER && PROJECT_FILTER !== fbProjectId && PROJECT_FILTER !== sbProjectId) continue;

    const snap = await firestore.collection(`users/${SIXTO_FB_UID}/projects/${fbProjectId}/posts`).get();
    for (const doc of snap.docs) {
      const raw = sanitize(doc.data());
      const stats = { stripped: 0 };
      const clean = stripFirebaseUrls(raw, stats);
      const id = deterministicUuid(`posts:sixto:${fbProjectId}:${doc.id}`);
      if (!SLUG_FILTER || clean.slug === SLUG_FILTER) {
        candidates.push({ id, fbProjectId, sbProjectId, fbDocId: doc.id, raw, clean, stripped: stats.stripped });
      }
    }
  }

  const current = await fetchCurrentPosts(candidates.map((c) => c.id));
  const repairs = [];

  for (const item of candidates) {
    const row = current.get(item.id);
    const currentLength = row?.content?.length || 0;
    const repairedLength = item.clean.content?.length || 0;
    const shouldRepair = row && currentLength === 0 && repairedLength > 0;
    if (!shouldRepair) continue;

    const projectTag = `project:${item.sbProjectId}`;
    const legacyTag = `legacy:${item.fbDocId}`;
    const existingTags = Array.isArray(item.clean.tags) ? item.clean.tags : [];

    repairs.push({
      post: {
        id: item.id,
        tenant_id: SIXTO_TENANT_ID,
        user_id: SIXTO_SB_ID,
        title: item.clean.title || '(untitled)',
        slug: item.clean.slug || null,
        content: item.clean.content || null,
        excerpt: item.clean.excerpt || null,
        featured_image: item.clean.featuredImage || item.clean.featured_image || '',
        category: item.clean.categoryId || item.clean.category || null,
        status: item.clean.status || 'draft',
        tags: [...new Set([...existingTags, projectTag, legacyTag])],
        author_name: item.clean.author || item.clean.authorName || null,
        published_at: item.clean.publishedAt || item.clean.published_at || null,
        is_featured: !!(item.clean.isFeatured || item.clean.is_featured),
        created_at: item.clean.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      projectPost: {
        id: item.id,
        project_id: item.sbProjectId,
        data: {
          ...item.clean,
          projectId: item.sbProjectId,
          legacyFirebaseProjectId: item.fbProjectId,
          legacyFirebaseDocId: item.fbDocId,
        },
      },
      currentLength,
      repairedLength,
      stripped: item.stripped,
    });
  }

  console.log(`Firebase posts scanned: ${candidates.length}`);
  console.log(`Supabase posts matched: ${current.size}`);
  console.log(`Repairs needed: ${repairs.length}`);

  const byProject = new Map();
  for (const repair of repairs) {
    const key = repair.projectPost.project_id;
    byProject.set(key, (byProject.get(key) || 0) + 1);
  }
  for (const [projectId, count] of byProject) {
    console.log(`  ${projectId}: ${count}`);
  }

  repairs.forEach((r) => {
    console.log(`  - ${r.post.title} | ${r.currentLength} -> ${r.repairedLength} chars | urls stripped=${r.stripped}`);
  });

  if (!APPLY || repairs.length === 0) return;

  const { error: postsError } = await supabase
    .from('posts')
    .upsert(repairs.map((r) => r.post), { onConflict: 'id', ignoreDuplicates: false });
  if (postsError) throw postsError;
  console.log(`Updated posts: ${repairs.length}`);

  const { error: projectPostsError } = await supabase
    .from('project_posts')
    .upsert(repairs.map((r) => r.projectPost), { onConflict: 'id', ignoreDuplicates: false });
  if (projectPostsError) throw projectPostsError;
  console.log(`Upserted project_posts: ${repairs.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
