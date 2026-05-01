/**
 * Backfill Changelog
 * 
 * Reads git history, groups commits by week, uses Gemini to generate
 * bilingual changelog entries, and writes them to Firestore.
 * 
 * Usage: node scripts/backfill-changelog.mjs [--dry-run] [--since=YYYY-MM-DD] [--publish]
 * 
 * Options:
 *   --dry-run   Preview entries without writing to Firestore
 *   --since     Start date (default: 2025-03-01)
 *   --publish   Auto-publish entries (default: draft)
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AUTO_PUBLISH = args.includes('--publish');
const sinceArg = args.find(a => a.startsWith('--since='));
const SINCE = sinceArg ? sinceArg.split('=')[1] : '2025-03-01';

// ─── Config ──────────────────────────────────────────────────────────────────
// Read API keys from .env files
const envPath = resolve(ROOT, 'QuimeraAi', '.env');
const envFile = readFileSync(envPath, 'utf-8');
const geminiKeyMatch = envFile.match(/^VITE_GEMINI_API_KEY=(.+)/m);
const googleKeyMatch = envFile.match(/^VITE_GOOGLE_API_KEY=(.+)/m);
const GEMINI_API_KEY = geminiKeyMatch?.[1]?.trim() || googleKeyMatch?.[1]?.trim();

// Read OpenRouter key from functions/.env (fallback provider)
let OPENROUTER_API_KEY = '';
try {
  const fnEnvPath = resolve(ROOT, 'QuimeraAi', 'functions', '.env');
  const fnEnvFile = readFileSync(fnEnvPath, 'utf-8');
  const orMatch = fnEnvFile.match(/^OPENROUTER_API_KEY=(.+)/m);
  OPENROUTER_API_KEY = orMatch?.[1]?.trim() || '';
} catch {}

if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
  console.error('❌ No API keys found. Need VITE_GEMINI_API_KEY/VITE_GOOGLE_API_KEY in QuimeraAi/.env or OPENROUTER_API_KEY in functions/.env');
  process.exit(1);
}
if (OPENROUTER_API_KEY) {
  console.log('🔑 OpenRouter fallback available');
}

const FIRESTORE_PROJECT_ID = 'quimeraai';
const CHANGELOG_COLLECTION = 'changelog';
const VALID_TAGS = ['new', 'improvement', 'fix', 'performance', 'security', 'breaking', 'deprecated', 'beta'];

// ─── Get Firebase access token via gcloud or service account ─────────────────
async function getFirebaseAccessToken() {
  // Try gcloud first
  try {
    const token = execSync('gcloud auth print-access-token 2>/dev/null', { encoding: 'utf-8' }).trim();
    if (token && token.length > 20) {
      console.log('🔐 Using gcloud auth token');
      return token;
    }
  } catch {}

  // Fall back to service account file
  const saPath = resolve(ROOT, 'service-account.json');
  let sa;
  try {
    sa = JSON.parse(readFileSync(saPath, 'utf-8'));
  } catch {
    console.error('❌ No auth available. Either:');
    console.error('   1. Run: gcloud auth login && gcloud auth application-default login');
    console.error('   2. Or place your Firebase service account JSON at: service-account.json');
    process.exit(1);
  }

  // JWT-based auth
  const crypto = await import('crypto');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signInput = `${encode(header)}.${encode(payload)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(sa.private_key, 'base64url');
  const jwt = `${signInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
  return (await tokenRes.json()).access_token;
}

// ─── Read git history ────────────────────────────────────────────────────────
function getCommitHistory() {
  const log = execSync(
    `git log --pretty=format:"%h|%s|%an|%ad" --date=short --since="${SINCE}" --reverse`,
    { cwd: ROOT, encoding: 'utf-8' }
  ).trim();

  if (!log) return [];

  return log.split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split('|');
    const date = rest.pop();
    const author = rest.pop();
    const message = rest.join('|');
    return { hash, message, author, date };
  });
}

// ─── Group commits by week ───────────────────────────────────────────────────
function groupByWeek(commits) {
  const weeks = new Map();

  for (const commit of commits) {
    // Filter out noise
    if (/^(Merge|merge|bump|chore\(deps\)|ci:|docs:)/i.test(commit.message)) continue;

    const d = new Date(commit.date);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey).push(commit);
  }

  // Filter out weeks with less than 2 commits
  const filtered = new Map();
  for (const [week, commits] of weeks) {
    if (commits.length >= 2) {
      filtered.set(week, commits);
    }
  }

  return filtered;
}

// ─── Call AI (Gemini → OpenRouter fallback) ─────────────────────────────────
async function generateWithAI(commits, weekDate, attempt = 1) {
  // Truncate to top 30 commits for very prolific weeks
  const limited = commits.length > 30 
    ? commits.slice(0, 30) 
    : commits;
  const commitList = limited.map(c => `- [${c.date}] ${c.message}`).join('\n');
  const truncatedNote = commits.length > 30 
    ? `\n(Showing 30 of ${commits.length} commits — summarize the overall theme)` 
    : '';

  const prompt = `You are a changelog writer for "Quimera AI", a SaaS website builder platform.

Analyze these git commits from the week of ${weekDate} and generate a changelog entry. Respond ONLY with valid JSON.

Git commits:
${commitList}${truncatedNote}

Generate a JSON object:
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
- tag "new" for new features, "improvement" for enhancements, "fix" for bug fixes, "performance" for speed, "security" for security updates
- If mixed, pick the most dominant type
- Maximum 5 features, minimum 1
- Keep titles concise, write for end users not developers
- Both languages must convey the same meaning
- Summarize related commits into single features`;

  // ── Try Gemini first ──────────────────────────────────────────────────
  let geminiError = null;
  if (GEMINI_API_KEY) {
    try {
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
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned empty response');

      const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      if (parsed.title_es && parsed.title_en && parsed.tag) {
        console.log('   ✅ Generated via Gemini');
        return parsed;
      }
      throw new Error('Incomplete response from Gemini');
    } catch (err) {
      geminiError = err;
      console.log(`   ⚠️ Gemini failed: ${err.message?.substring(0, 80)}`);
    }
  }

  // ── Fallback to OpenRouter ────────────────────────────────────────────
  if (OPENROUTER_API_KEY) {
    console.log('   🔄 Falling back to OpenRouter...');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://quimera.ai',
          'X-Title': 'Quimera AI Changelog',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt + '\n\nRespond ONLY with the JSON object, no markdown fences.' }],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('OpenRouter returned empty response');

      const parsed = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      if (parsed.title_es && parsed.title_en && parsed.tag) {
        console.log('   ✅ Generated via OpenRouter');
        return parsed;
      }
      throw new Error('Incomplete response from OpenRouter');
    } catch (err) {
      console.log(`   ⚠️ OpenRouter failed: ${err.message?.substring(0, 80)}`);
      // If both failed, throw the last error
      throw err;
    }
  }

  // ── Both failed or unavailable ────────────────────────────────────────
  if (geminiError) throw geminiError;

  // Retry once with backoff
  if (attempt < 2) {
    console.log('   ⏳ Retrying in 3s...');
    await new Promise(r => setTimeout(r, 3000));
    return generateWithAI(commits, weekDate, attempt + 1);
  }

  throw new Error('No AI provider available or all attempts failed');
}

// ─── Write to Firestore ──────────────────────────────────────────────────────
async function writeToFirestore(entry, weekDate, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${CHANGELOG_COLLECTION}`;

  // Use the Friday of the week as the entry date
  const friday = new Date(weekDate);
  friday.setDate(friday.getDate() + 4);
  const entryDate = friday.toISOString().split('T')[0];

  const now = new Date().toISOString();
  const slug = entry.title_es
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Date.now();

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
      date: { stringValue: entryDate },
      tag: { stringValue: VALID_TAGS.includes(entry.tag) ? entry.tag : 'improvement' },
      title: { stringValue: entry.title_es },
      title_en: { stringValue: entry.title_en },
      description: { stringValue: entry.description_es },
      description_en: { stringValue: entry.description_en },
      features: { arrayValue: { values: features } },
      isPublished: { booleanValue: AUTO_PUBLISH },
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
    throw new Error(`Firestore write failed: ${await response.text()}`);
  }

  return (await response.json()).name?.split('/').pop();
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📖 Backfill Changelog');
  console.log(`   Since: ${SINCE}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`   Publish: ${AUTO_PUBLISH ? 'Yes' : 'No (drafts)'}`);
  console.log('');

  // 1. Read git history
  console.log('📂 Reading git history...');
  const allCommits = getCommitHistory();
  console.log(`   Found ${allCommits.length} total commits since ${SINCE}`);

  // 2. Group by week
  const weeks = groupByWeek(allCommits);
  console.log(`   Grouped into ${weeks.size} weeks (with ≥2 meaningful commits each)\n`);

  if (weeks.size === 0) {
    console.log('⏭️ No weeks with enough commits to generate entries.');
    return;
  }

  // 3. Get auth (only if not dry run)
  let accessToken = null;
  if (!DRY_RUN) {
    accessToken = await getFirebaseAccessToken();
    console.log('✅ Authenticated\n');
  }

  // 4. Process each week
  let created = 0;
  let failed = 0;
  const sortedWeeks = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [weekDate, commits] of sortedWeeks) {
    const endDate = new Date(weekDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekLabel = `${weekDate} → ${endDate.toISOString().split('T')[0]}`;

    console.log(`\n━━━ Week: ${weekLabel} (${commits.length} commits) ━━━`);
    commits.forEach(c => console.log(`   ${c.date} ${c.message.substring(0, 70)}`));

    try {
      // Rate limit: wait between Gemini calls
      if (created > 0) {
        console.log('   ⏳ Waiting 2s (rate limit)...');
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('   🤖 Generating with Gemini...');
      const entry = await generateWithAI(commits, weekDate);
      
      console.log(`   📋 Tag: ${entry.tag}`);
      console.log(`   📋 ES: ${entry.title_es}`);
      console.log(`   📋 EN: ${entry.title_en}`);
      console.log(`   📋 Features: ${entry.features?.length || 0}`);

      if (!DRY_RUN) {
        const docId = await writeToFirestore(entry, weekDate, accessToken);
        console.log(`   ✅ Created: ${docId} (${AUTO_PUBLISH ? 'published' : 'draft'})`);
      } else {
        console.log('   ⏭️ Skipped write (dry run)');
      }

      created++;
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`🎉 Backfill complete!`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total weeks: ${weeks.size}`);
  if (!DRY_RUN && !AUTO_PUBLISH) {
    console.log('\n   → Review and publish entries from the Admin Dashboard');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
