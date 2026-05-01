import admin from 'firebase-admin';
import fetch from 'node-fetch';

const TRANSLATABLE_KEYS = new Set([
  'headline', 'subheadline', 'primaryCta', 'secondaryCta',
  'title', 'description', 'subtitle', 'text', 'buttonText',
  'loginText', 'ctaText', 'badgeText', 'featureTitle', 'featureDescription',
  'name', 'role', 'quote', 'author', 'price', 'duration', 'badge',
  'buttonLabel', 'placeholder', 'label', 'content', 'message',
  'greeting', 'tooltip', 'footerText', 'address', 'city',
  'value', 'stat', 'category', 'company', 'companyName'
]);

const apiKey = "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";

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function translateBatch(texts) {
    if (texts.length === 0) return [];
    const prompt = `Translate the following Spanish text snippets to professional, concise UI English.
Return ONLY a raw JSON array of the translated strings in the EXACT SAME ORDER. Do not include markdown blocks or any other text.
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

function collectTranslatableNodes(obj, nodes) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            collectTranslatableNodes(obj[i], nodes);
        }
        return;
    }
    for (const key in obj) {
        const value = obj[key];
        if (value && typeof value === 'object' && Object.keys(value).length === 2 && 'es' in value && 'en' in value) {
            continue;
        }
        if (TRANSLATABLE_KEYS.has(key) && typeof value === 'string' && value.trim().length > 0 && !value.startsWith('#')) {
            nodes.push({ obj, key, text: value });
        } else if (typeof value === 'object') {
            collectTranslatableNodes(value, nodes);
        }
    }
}

async function processDocument(docRef, docId) {
    const docSnap = await docRef.get();
    if (!docSnap.exists) return 0;
    const data = docSnap.data();
    let modified = false;
    const nodesToTranslate = [];
    
    // Sometimes it's data.components, sometimes data.sections, sometimes data.pages[].components...
    // Let's just walk the whole document since we have TRANSLATABLE_KEYS filter!
    collectTranslatableNodes(data, nodesToTranslate);
    
    if (nodesToTranslate.length > 0) {
        console.log(`[${docId}] Found ${nodesToTranslate.length} strings to translate.`);
        const batchSize = 50;
        for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
            const batch = nodesToTranslate.slice(i, i + batchSize);
            const texts = batch.map(b => b.text);
            try {
                const translatedTexts = await translateBatch(texts);
                if (translatedTexts.length === batch.length) {
                    for (let j = 0; j < batch.length; j++) {
                        const { obj, key, text } = batch[j];
                        const enText = translatedTexts[j];
                        obj[key] = { es: text, en: enText };
                        modified = true;
                    }
                } else {
                    console.error("Mismatch in translation length. Skipping batch.");
                }
            } catch (e) {
                console.error("Error translating batch:", e);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    
    if (modified) {
        await docRef.set(data);
        console.log(`Updated document ${docId} successfully!`);
        return nodesToTranslate.length;
    }
    return 0;
}

async function run() {
    let totalTranslated = 0;

    console.log('Fetching global AppLandingConfig...');
    const globalConfigRef = db.collection('appContent/data/config').doc('landing');
    totalTranslated += await processDocument(globalConfigRef, 'GlobalLandingConfig');

    console.log('\nFetching all Agency Landings...');
    const agencySnapshot = await db.collection('agencyLandings').get();
    for (const doc of agencySnapshot.docs) {
        totalTranslated += await processDocument(doc.ref, `AgencyLanding_${doc.id}`);
    }
    
    console.log('\nFetching all User Projects...');
    const usersSnapshot = await db.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
        const projectsSnapshot = await userDoc.ref.collection('projects').get();
        for (const projDoc of projectsSnapshot.docs) {
            totalTranslated += await processDocument(projDoc.ref, `UserProject_${userDoc.id}_${projDoc.id}`);
        }
    }
    
    console.log(`\nMigration completed. Translated ${totalTranslated} total strings across Firestore.`);
}

run().catch(console.error);
