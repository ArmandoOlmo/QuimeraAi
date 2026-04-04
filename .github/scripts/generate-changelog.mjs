/**
 * Auto Changelog Generator
 * 
 * Reads git commits, uses Gemini AI to generate a structured changelog entry,
 * and writes it to Firestore as a draft (isPublished: false).
 * 
 * Required env vars:
 *   GEMINI_API_KEY          - Google Gemini API key
 *   FIREBASE_SERVICE_ACCOUNT - Firebase service account JSON
 *   COMMIT_DATA             - Path to file with commit data
 */

import { readFileSync } from 'fs';

// ─── Config ──────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FIREBASE_SA = process.env.FIREBASE_SERVICE_ACCOUNT;
const COMMIT_FILE = process.env.COMMIT_DATA || '/tmp/commits.txt';

const FIRESTORE_PROJECT_ID = 'quimeraai';
const CHANGELOG_COLLECTION = 'changelog';

const VALID_TAGS = ['new', 'improvement', 'fix', 'performance', 'security', 'breaking', 'deprecated', 'beta'];

// ─── Validate environment ────────────────────────────────────────────────────
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set');
  process.exit(1);
}
if (!FIREBASE_SA) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT is not set');
  process.exit(1);
}

// ─── Read commits ────────────────────────────────────────────────────────────
const rawCommits = readFileSync(COMMIT_FILE, 'utf-8').trim();
if (!rawCommits) {
  console.log('⏭️ No commits to process');
  process.exit(0);
}

const commits = rawCommits
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const [hash, ...rest] = line.split('|');
    const author = rest.pop();
    const message = rest.join('|');
    return { hash, message, author };
  });

console.log(`📝 Processing ${commits.length} commits:`);
commits.forEach(c => console.log(`  ${c.hash} - ${c.message} (${c.author})`));

// ─── Call Gemini API ─────────────────────────────────────────────────────────
async function generateWithGemini(commits) {
  const commitList = commits.map(c => `- ${c.message} (${c.author})`).join('\n');

  const prompt = `You are a changelog writer for "Quimera AI", a SaaS website builder platform.

Analyze these git commits and generate a changelog entry. Respond ONLY with valid JSON, no markdown, no code blocks.

Git commits:
${commitList}

Generate a JSON object with these fields:
{
  "tag": "one of: new, improvement, fix, performance, security, breaking, deprecated, beta",
  "title_es": "Short attractive title in Spanish (max 60 chars)",
  "title_en": "Short attractive title in English (max 60 chars)",
  "description_es": "Clear description in Spanish (1-2 sentences)",
  "description_en": "Clear description in English (1-2 sentences)",
  "features": [
    {
      "title_es": "Feature title in Spanish",
      "title_en": "Feature title in English",
      "description_es": "Feature description in Spanish",
      "description_en": "Feature description in English"
    }
  ]
}

Rules:
- tag "new" = new features or functionality
- tag "improvement" = enhancements to existing features
- tag "fix" = bug fixes
- tag "performance" = speed/optimization improvements
- tag "security" = security updates
- tag "breaking" = breaking changes that may affect users
- If there are mixed types, pick the most dominant one
- Maximum 5 features, minimum 1
- Keep titles concise and user-friendly (not technical git messages)
- Write for end users, not developers
- Both Spanish and English versions must convey the same meaning`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  // Parse the JSON response
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Firebase Auth (get access token from service account) ───────────────────
async function getFirebaseAccessToken() {
  const sa = JSON.parse(FIREBASE_SA);

  // Build JWT
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Import crypto for JWT signing
  const crypto = await import('crypto');

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const signInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(sa.private_key, 'base64url');

  const jwt = `${signInput}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ─── Write to Firestore ──────────────────────────────────────────────────────
async function writeToFirestore(entry, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${CHANGELOG_COLLECTION}`;

  const now = new Date().toISOString();
  const slug = entry.title_es
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Date.now();

  // Build features array
  const features = (entry.features || []).map((f, i) => ({
    mapValue: {
      fields: {
        id: { stringValue: String(i + 1) },
        title: { stringValue: f.title_es },
        title_en: { stringValue: f.title_en },
        description: { stringValue: f.description_es },
        description_en: { stringValue: f.description_en },
      },
    },
  }));

  const document = {
    fields: {
      date: { stringValue: now.split('T')[0] },
      tag: { stringValue: VALID_TAGS.includes(entry.tag) ? entry.tag : 'improvement' },
      title: { stringValue: entry.title_es },
      title_en: { stringValue: entry.title_en },
      description: { stringValue: entry.description_es },
      description_en: { stringValue: entry.description_en },
      features: { arrayValue: { values: features } },
      isPublished: { booleanValue: false },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now },
      slug: { stringValue: slug },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore write failed ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const docId = result.name?.split('/').pop();
  return docId;
}

// ─── Check for duplicates (same day, similar content) ────────────────────────
async function checkDuplicateToday(accessToken) {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: CHANGELOG_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'date' },
            op: 'EQUAL',
            value: { stringValue: today },
          },
        },
        limit: 1,
      },
    }),
  });

  if (!response.ok) return false;

  const results = await response.json();
  // If we got a document back, there's already an entry for today
  return results.some(r => r.document);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log('\n🔐 Authenticating with Firebase...');
    const accessToken = await getFirebaseAccessToken();
    console.log('✅ Authenticated');

    // Check for duplicate entry today
    console.log('\n🔍 Checking for existing entry today...');
    const hasDuplicate = await checkDuplicateToday(accessToken);
    if (hasDuplicate) {
      console.log('⏭️ Changelog entry already exists for today. Skipping.');
      process.exit(0);
    }
    console.log('✅ No duplicate found');

    console.log('\n🤖 Generating changelog with Gemini...');
    const entry = await generateWithGemini(commits);
    console.log('✅ Generated entry:');
    console.log(`   Tag: ${entry.tag}`);
    console.log(`   Title (ES): ${entry.title_es}`);
    console.log(`   Title (EN): ${entry.title_en}`);
    console.log(`   Features: ${entry.features?.length || 0}`);

    console.log('\n📝 Writing to Firestore (as draft)...');
    const docId = await writeToFirestore(entry, accessToken);
    console.log(`✅ Created changelog entry: ${docId}`);
    console.log('   Status: DRAFT (isPublished: false)');
    console.log('   → Review and publish from the Admin Dashboard');

    console.log('\n🎉 Auto-changelog complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    // Don't fail the entire CI pipeline for changelog errors
    process.exit(0);
  }
}

main();
