#!/usr/bin/env node
/**
 * ============================================================
 * MIGRATE NEWS IMAGES: Firebase Storage → Supabase Storage
 * ============================================================
 * 
 * Downloads images from Firebase Storage URLs (and decodes Base64)
 * then uploads them to Supabase Storage bucket 'quimera-storage',
 * and updates the news table with the new public URLs.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/migrate-news-images.mjs
 */

import { writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// CONFIGURATION
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://elfcrnhffuvntlfuvumd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = 'quimera-storage';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

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
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`);
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
  if (!res.ok) throw new Error(`PATCH ${table}/${id} failed (${res.status}): ${await res.text()}`);
}

async function supabaseStorageUpload(storagePath, fileBuffer, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Storage upload ${storagePath} failed (${res.status}): ${errText}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

// ============================================================
// IMAGE HELPERS
// ============================================================

function getContentTypeFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.svg')) return 'image/svg+xml';
  return 'image/png'; // default
}

function getExtFromContentType(ct) {
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('gif')) return '.gif';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('svg')) return '.svg';
  return '.png';
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || getContentTypeFromUrl(url);
  return { buffer, contentType: ct };
}

function decodeBase64Image(dataUri) {
  const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 data URI');
  return {
    buffer: Buffer.from(match[2], 'base64'),
    contentType: match[1],
  };
}

// ============================================================
// MAIN MIGRATION
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('  NEWS IMAGES: Firebase/Base64 → Supabase Storage');
  console.log('============================================================\n');

  // 1. Fetch all news items
  const newsItems = await supabaseGet('news?select=id,title,image_url');
  console.log(`📋 Found ${newsItems.length} news items.\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Track unique URLs to avoid re-uploading the same image
  const urlToNewUrl = new Map();

  for (const item of newsItems) {
    const { id, title, image_url } = item;

    if (!image_url) {
      console.log(`  ⏭️  "${title}" — no image, skipping.`);
      skipped++;
      continue;
    }

    // Already migrated to Supabase
    if (image_url.includes('elfcrnhffuvntlfuvumd.supabase.co')) {
      console.log(`  ✅ "${title}" — already on Supabase, skipping.`);
      skipped++;
      continue;
    }

    // Check if we already uploaded this exact URL
    if (urlToNewUrl.has(image_url)) {
      const newUrl = urlToNewUrl.get(image_url);
      console.log(`  ♻️  "${title}" — reusing previously uploaded URL.`);
      try {
        await supabasePatch('news', id, { image_url: newUrl });
        migrated++;
      } catch (err) {
        console.error(`  ❌ "${title}" — failed to update URL: ${err.message}`);
        failed++;
      }
      continue;
    }

    try {
      let buffer, contentType;

      if (image_url.startsWith('data:')) {
        // Base64 image
        console.log(`  🔄 "${title}" — decoding Base64 image...`);
        ({ buffer, contentType } = decodeBase64Image(image_url));
      } else {
        // Firebase Storage URL
        console.log(`  🔄 "${title}" — downloading from Firebase Storage...`);
        ({ buffer, contentType } = await downloadImage(image_url));
      }

      const ext = getExtFromContentType(contentType);
      const timestamp = Date.now();
      const safeName = (title || 'news').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const storagePath = `admin_news/${timestamp}_${safeName}${ext}`;

      console.log(`     Uploading ${(buffer.length / 1024).toFixed(1)}KB → ${storagePath}`);
      const newUrl = await supabaseStorageUpload(storagePath, buffer, contentType);

      // Update the news record
      await supabasePatch('news', id, { image_url: newUrl });

      urlToNewUrl.set(image_url, newUrl);
      migrated++;
      console.log(`  ✅ "${title}" → ${newUrl}`);
    } catch (err) {
      console.error(`  ❌ "${title}" — ${err.message}`);
      failed++;
    }
  }

  console.log('\n============================================================');
  console.log(`  ✅ DONE! Migrated: ${migrated}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
