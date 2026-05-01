const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const glob = require('glob');

const apiKey = "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";

const TRANSLATABLE_KEYS = new Set([
  'headline', 'subheadline', 'primaryCta', 'secondaryCta',
  'title', 'description', 'subtitle', 'text', 'buttonText',
  'loginText', 'ctaText', 'badgeText', 'featureTitle', 'featureDescription',
  'name', 'role', 'quote', 'author', 'price', 'duration', 'badge',
  'buttonLabel', 'placeholder', 'label', 'content', 'message',
  'greeting', 'tooltip', 'footerText', 'address', 'city',
  'value', 'stat', 'category', 'company'
]);

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

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    if (content.startsWith('```json')) content = content.replace(/^```json\n|\n```$/g, '');
    if (content.startsWith('```')) content = content.replace(/^```\n|\n```$/g, '');
    return JSON.parse(content);
}

async function run() {
    const project = new Project();
    
    const filesToProcess = [
        '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/data/initialData.ts',
        ...glob.sync('/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/data/presets/*.ts')
    ];
    
    console.log(`Found ${filesToProcess.length} files to process.`);
    
    for (const filePath of filesToProcess) {
        console.log(`Processing ${filePath}...`);
        const sourceFile = project.addSourceFileAtPath(filePath);
        
        const nodesToTranslate = [];
        
        // Find all property assignments
        const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
        
        for (const prop of propertyAssignments) {
            const nameNode = prop.getNameNode();
            let name = nameNode.getText();
            // Remove quotes if present
            name = name.replace(/^['"]|['"]$/g, '');
            
            if (TRANSLATABLE_KEYS.has(name)) {
                const initializer = prop.getInitializer();
                if (initializer && (initializer.getKind() === SyntaxKind.StringLiteral || initializer.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral)) {
                    let text = initializer.getLiteralValue();
                    if (text && text.trim().length > 0 && !text.startsWith('#')) {
                        nodesToTranslate.push({ prop, text });
                    }
                }
            }
        }
        
        console.log(`Found ${nodesToTranslate.length} strings to translate in ${filePath}`);
        
        // Process in batches
        const batchSize = 50;
        for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
            const batch = nodesToTranslate.slice(i, i + batchSize);
            const texts = batch.map(b => b.text);
            
            try {
                const translatedTexts = await translateBatch(texts);
                
                if (translatedTexts.length === batch.length) {
                    for (let j = 0; j < batch.length; j++) {
                        const { prop, text } = batch[j];
                        const enText = translatedTexts[j];
                        
                        // Replace string with object literal
                        prop.setInitializer(writer => {
                            writer.block(() => {
                                writer.writeLine(`es: ${JSON.stringify(text)},`);
                                writer.writeLine(`en: ${JSON.stringify(enText)}`);
                            });
                        });
                    }
                } else {
                    console.error("Mismatch in translation length. Skipping batch.");
                }
            } catch (e) {
                console.error("Error translating batch:", e);
            }
            
            await new Promise(r => setTimeout(r, 1000));
        }
        
        sourceFile.saveSync();
        console.log(`Saved ${filePath}`);
    }
}

run();
