#!/usr/bin/env node
/**
 * ============================================================
 * MIGRATE NEWS IMAGES via Firebase Admin SDK → Supabase Storage
 * ============================================================
 * 
 * Uses firebase-admin to download files from Firebase Storage
 * (bypasses public URL billing restrictions), then uploads to
 * Supabase Storage and updates the news table.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-news-images-admin.mjs
 */

import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load firebase-admin from functions/node_modules
const requireFromFunctions = createRequire(resolve(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');

// ============================================================
// CONFIGURATION
// ============================================================

const FIREBASE_PROJECT_ID = 'quimeraai';
const FIREBASE_STORAGE_BUCKET = 'quimeraai.firebasestorage.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_BUCKET = 'quimera-storage';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

// ============================================================
// INIT FIREBASE ADMIN
// ============================================================

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
  });
}

const firebaseBucket = admin.storage().bucket();

// ============================================================
// SUPABASE REST HELPERS
// ============================================================

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`GET failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function supabasePatch(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH failed (${res.status}): ${await res.text()}`);
}

async function supabaseStorageUpload(storagePath, fileBuffer, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${storagePath}`;
}

// ============================================================
// HELPERS
// ============================================================

function extractFirebaseStoragePath(url) {
  // Firebase Storage URLs have the path encoded in the URL:
  // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch (e) {}
  return null;
}

function getContentTypeFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

function getExtFromContentType(ct) {
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('gif')) return '.gif';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('svg')) return '.svg';
  return '.png';
}

async function downloadFromFirebaseAdmin(storagePath) {
  const file = firebaseBucket.file(storagePath);
  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType || getContentTypeFromPath(storagePath);
  return { buffer, contentType };
}

function decodeBase64Image(dataUri) {
  const match = dataUri.match(/^data:(image\/[\w+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 data URI');
  return {
    buffer: Buffer.from(match[2], 'base64'),
    contentType: match[1],
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('  NEWS IMAGES: Firebase Admin SDK → Supabase Storage');
  console.log('============================================================\n');

  const newsItems = await supabaseGet('news?select=id,title,image_url');
  console.log(`📋 Found ${newsItems.length} news items.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Cache: Firebase path → new Supabase URL (avoid re-uploading duplicates)
  const pathToNewUrl = new Map();

  for (const item of newsItems) {
    const { id, title, image_url } = item;

    if (!image_url) {
      console.log(`  ⏭️  "${title}" — no image.`);
      skipped++;
      continue;
    }

    // Already on Supabase
    if (image_url.includes('elfcrnhffuvntlfuvumd.supabase.co')) {
      console.log(`  ✅ "${title}" — already on Supabase.`);
      skipped++;
      continue;
    }

    try {
      let buffer, contentType;

      if (image_url.startsWith('data:')) {
        // Base64
        console.log(`  🔄 "${title}" — decoding Base64...`);
        ({ buffer, contentType } = decodeBase64Image(image_url));
      } else if (image_url.includes('firebasestorage.googleapis.com')) {
        // Firebase Storage — use Admin SDK
        const fbPath = extractFirebaseStoragePath(image_url);
        if (!fbPath) {
          throw new Error('Could not parse Firebase Storage path from URL');
        }

        // Check cache
        if (pathToNewUrl.has(fbPath)) {
          const newUrl = pathToNewUrl.get(fbPath);
          console.log(`  ♻️  "${title}" — reusing cached upload for ${fbPath}`);
          await supabasePatch('news', id, { image_url: newUrl });
          migrated++;
          continue;
        }

        console.log(`  🔄 "${title}" — downloading via Admin SDK: ${fbPath}`);
        ({ buffer, contentType } = await downloadFromFirebaseAdmin(fbPath));
      } else {
        // Generic URL — try direct download
        console.log(`  🔄 "${title}" — downloading from URL...`);
        const res = await fetch(image_url);
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        buffer = Buffer.from(await res.arrayBuffer());
        contentType = res.headers.get('content-type') || 'image/png';
      }

      const ext = getExtFromContentType(contentType);
      const timestamp = Date.now();
      const safeName = (title || 'news').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const supabasePath = `admin_news/${timestamp}_${safeName}${ext}`;

      console.log(`     Uploading ${(buffer.length / 1024).toFixed(1)}KB → ${supabasePath}`);
      const newUrl = await supabaseStorageUpload(supabasePath, buffer, contentType);

      await supabasePatch('news', id, { image_url: newUrl });

      // Cache it
      const fbPath = extractFirebaseStoragePath(image_url);
      if (fbPath) pathToNewUrl.set(fbPath, newUrl);

      migrated++;
      console.log(`  ✅ "${title}" → done`);
    } catch (err) {
      console.error(`  ❌ "${title}" — ${err.message}`);
      failed++;
    }
  }

  console.log('\n============================================================');
  console.log(`  📊 Migrated: ${migrated} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
