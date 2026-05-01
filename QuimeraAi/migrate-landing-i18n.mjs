/**
 * migrate-landing-i18n.mjs
 * 
 * Migrates all landing page section content in Firestore from plain Spanish strings
 * to bilingual { es: "...", en: "..." } i18n objects.
 * 
 * Path: globalSettings/landingPage/sections/{sectionId}
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json node migrate-landing-i18n.mjs
 */

import admin from 'firebase-admin';
import fetch from 'node-fetch';

// ── All translatable text field keys (matching i18nContent.ts TRANSLATABLE_FIELDS + extras) ──
const TRANSLATABLE_KEYS = new Set([
  // Core content
  'title', 'subtitle', 'description', 'text', 'headline', 'subheadline',
  // Buttons / CTAs
  'buttonText', 'primaryButtonText', 'secondaryButtonText', 'ctaText', 'ctaSubtitle',
  'primaryCta', 'secondaryCta', 'buttonLabel', 'registerText', 'loginText',
  // Badges / labels
  'badgeText', 'tagline', 'accentText', 'badge', 'label',
  // Long-form content
  'introText', 'differentiatorTitle', 'differentiatorText',
  'flowText', 'footnote', 'explainerText',
  // Lists / Items
  'name', 'question', 'answer', 'quote', 'author', 'role', 'company', 'companyName',
  'price', 'billingPeriod', 'linkText', 'frequency', 'period',
  'featureTitle', 'featureDescription', 'category',
  // Footer / contact
  'footerText', 'address', 'city', 'state', 'zipCode', 'country', 'phone', 'email',
  'copyrightText', 'searchPlaceholder',
  // Misc
  'placeholder', 'content', 'message', 'greeting', 'tooltip',
  'value', 'stat', 'duration', 'logoText',
]);

// Keys that should NOT be translated — they're structural, not user-facing text
const SKIP_KEYS = new Set([
  'backgroundColor', 'textColor', 'accentColor', 'secondaryColor', 'mainColor',
  'background', 'accent', 'cardBackground', 'cardBorder', 'cardText', 'iconColor',
  'secondaryText', // when inside colors obj
  'headingFont', 'bodyFont', 'buttonFont',
  'type', 'id', 'icon', 'imageUrl', 'backgroundImageUrl', 'logoUrl',
  'buttonLink', 'primaryButtonLink', 'secondaryButtonLink', 'ctaUrl', 'loginUrl', 'href',
]);

const apiKey = "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";

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

// ── Translation via OpenRouter ──
async function translateBatch(texts) {
    if (texts.length === 0) return [];
    const prompt = `Translate the following Spanish UI text snippets to professional, natural English.
These are for a SaaS website builder platform called "QuimeraAi" (keep brand names unchanged).
Return ONLY a raw JSON array of the translated strings in the EXACT SAME ORDER.
Do not include markdown blocks, explanations, or any other text.

JSON Array of Spanish strings:
${JSON.stringify(texts)}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status} ${await response.text()}`);
    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.replace(/^```json\n|\n```$/g, '');
    if (content.startsWith('```')) content = content.replace(/^```\n|\n```$/g, '');
    return JSON.parse(content);
}

// ── Check if a value is already an i18n map ──
function isI18nMap(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    return keys.every(k => k.length <= 5 && typeof obj[k] === 'string');
}

// ── Check if an object is a "colors" configuration (not content) ──
function isColorsObject(key, obj) {
    if (key === 'colors') return true;
    // If all keys are known color properties, skip
    const colorKeys = ['background', 'text', 'accent', 'cardBackground', 'cardBorder',
        'cardText', 'iconColor', 'secondaryText', 'primary', 'secondary', 'heading',
        'surface', 'buttonBackground', 'buttonText', 'secondaryButtonBackground',
        'secondaryButtonText', 'textBackground', 'imageBackground'];
    return Object.keys(obj).every(k => colorKeys.includes(k));
}

// ── Collect all translatable string nodes recursively ──
function collectTranslatableNodes(obj, nodes, parentKey = '') {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (typeof obj[i] === 'object' && obj[i] !== null) {
                collectTranslatableNodes(obj[i], nodes, `${parentKey}[${i}]`);
            }
        }
        return;
    }

    for (const key in obj) {
        const value = obj[key];

        // Skip non-content keys
        if (SKIP_KEYS.has(key)) continue;

        // Already an i18n map? Skip.
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && isI18nMap(value)) {
            // Already bilingual, check if 'en' is missing
            if (!value.en && value.es) {
                nodes.push({ obj, key, text: value.es, partial: true });
            }
            continue;
        }

        // Translatable string field
        if (TRANSLATABLE_KEYS.has(key) && typeof value === 'string' && value.trim().length > 0) {
            // Skip if it looks like a URL, hex color, or CSS class
            if (value.startsWith('#') || value.startsWith('http') || value.startsWith('/') || value.startsWith('rgba')) continue;
            nodes.push({ obj, key, text: value });
            continue;
        }

        // Recurse into nested objects (but NOT colors)
        if (typeof value === 'object' && value !== null) {
            if (isColorsObject(key, value)) continue;
            collectTranslatableNodes(value, nodes, `${parentKey}.${key}`);
        }
    }
}

// ── Process a single Firestore document ──
async function processDocument(docRef, docId) {
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        console.log(`  [${docId}] Document not found, skipping.`);
        return 0;
    }

    const data = docSnap.data();
    const nodesToTranslate = [];

    collectTranslatableNodes(data, nodesToTranslate);

    if (nodesToTranslate.length === 0) {
        console.log(`  [${docId}] No untranslated strings found.`);
        return 0;
    }

    console.log(`  [${docId}] Found ${nodesToTranslate.length} strings to translate.`);
    let modified = false;
    const batchSize = 40;

    for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
        const batch = nodesToTranslate.slice(i, i + batchSize);
        const texts = batch.map(b => b.text);
        
        console.log(`    Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(nodesToTranslate.length / batchSize)}...`);

        try {
            const translatedTexts = await translateBatch(texts);
            if (translatedTexts.length === batch.length) {
                for (let j = 0; j < batch.length; j++) {
                    const { obj, key, text, partial } = batch[j];
                    const enText = translatedTexts[j];

                    if (partial) {
                        // Already has { es: "..." }, just add en
                        obj[key] = { ...obj[key], en: enText };
                    } else {
                        // Convert plain string to i18n map
                        obj[key] = { es: text, en: enText };
                    }
                    modified = true;
                }
            } else {
                console.error(`    ⚠️ Mismatch: expected ${batch.length}, got ${translatedTexts.length}. Skipping batch.`);
            }
        } catch (e) {
            console.error(`    ❌ Error translating batch:`, e.message);
        }

        // Respect rate limits
        await new Promise(r => setTimeout(r, 1200));
    }

    if (modified) {
        await docRef.set(data);
        console.log(`  ✅ Updated document ${docId} successfully!`);
        return nodesToTranslate.length;
    }

    return 0;
}

// ── Main ──
async function run() {
    let totalTranslated = 0;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Landing Page Sections i18n Migration');
    console.log('  Path: globalSettings/landingPage/sections/*');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Process landing page sections sub-collection
    const sectionsColRef = db.collection('globalSettings').doc('landingPage').collection('sections');
    const sectionsSnap = await sectionsColRef.get();

    if (sectionsSnap.empty) {
        console.log('No sections found in globalSettings/landingPage/sections/');
    } else {
        console.log(`Found ${sectionsSnap.size} sections.\n`);
        for (const sectionDoc of sectionsSnap.docs) {
            totalTranslated += await processDocument(sectionDoc.ref, sectionDoc.id);
        }
    }

    // 2. Also process the legacy single-document format if it exists
    console.log('\nChecking legacy single-document format...');
    const rootRef = db.collection('globalSettings').doc('landingPage');
    const rootSnap = await rootRef.get();
    if (rootSnap.exists && rootSnap.data()?.sections) {
        console.log('Found legacy sections array in root document.');
        totalTranslated += await processDocument(rootRef, 'landingPage-root');
    }

    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`  Migration complete! Translated ${totalTranslated} total strings.`);
    console.log(`═══════════════════════════════════════════════════\n`);
}

run().catch(console.error);
