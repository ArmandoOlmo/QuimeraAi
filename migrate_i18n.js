const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'QuimeraAi', 'components', 'controls', 'sections');

// These are paths that should NOT be migrated to I18nInput
const excludePathsRegex = /(link|url|image|icon|color|background|margin|padding|size|height|width|radius|opacity|id|type|menuId|columns)$/i;

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Add I18nInput and I18nTextArea to the import from EditorControlPrimitives
    const importRegex = /import\s+\{([^}]*)\}\s+from\s+['"]\.\.\/\.\.\/ui\/EditorControlPrimitives['"];?/s;
    const match = importRegex.exec(content);
    
    if (match) {
        let importsText = match[1];
        let newImportsText = importsText;
        if (!importsText.includes('I18nInput')) {
            newImportsText += ', I18nInput';
        }
        if (!importsText.includes('I18nTextArea')) {
            newImportsText += ', I18nTextArea';
        }
        content = content.replace(importsText, newImportsText);
    } else {
        // If there's no import, we add it if needed
        if (content.includes('<Input') || content.includes('<TextArea')) {
            content = `import { I18nInput, I18nTextArea } from '../../ui/EditorControlPrimitives';\n` + content;
        }
    }

    // 2. Replace <TextArea with <I18nTextArea
    // TextAreas are mostly used for descriptions, which are translatable.
    content = content.replace(/<TextArea(\s|>)/g, '<I18nTextArea$1');
    content = content.replace(/<\/TextArea>/g, '</I18nTextArea>');

    // 3. Replace <Input with <I18nInput cautiously
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        let inputMatch = line.match(/<Input\b/);
        while (inputMatch) {
            const index = inputMatch.index;
            // Look ahead to find the end of the tag
            // We assume the tag ends with /> or > in the same line or next few lines
            let tagFullText = line.substring(index);
            let endIndex = tagFullText.search(/\/>|>[^<]*<\/Input>/);
            
            if (endIndex === -1) {
                // If it spans multiple lines, pull more lines
                let offset = 1;
                while (endIndex === -1 && i + offset < lines.length) {
                    tagFullText += '\n' + lines[i + offset];
                    endIndex = tagFullText.search(/\/>|>[^<]*<\/Input>/);
                    offset++;
                }
            }
            
            // Analyze the tag
            let shouldMigrate = true;
            
            // Check for onChange={... setNestedData('path', ...)}
            const nestedDataMatch = tagFullText.match(/setNestedData\(\s*['"`]([^'"`]+)['"`]/);
            if (nestedDataMatch) {
                const pathStr = nestedDataMatch[1];
                if (excludePathsRegex.test(pathStr)) {
                    shouldMigrate = false;
                }
            } else if (tagFullText.match(/setNestedData\(\s*`[^`]*?(link|url|image|icon|color|background|margin|padding|size|height|width|radius|opacity|id|type|menuId|columns)[^`]*?`\s*,/i)) {
                // Variable template literals
                shouldMigrate = false;
            }
            
            // Manual overrides for specific structural inputs
            if (tagFullText.includes('placeholder="https://') || tagFullText.includes('type="number"')) {
                shouldMigrate = false;
            }

            if (shouldMigrate) {
                line = line.substring(0, index) + '<I18nInput' + line.substring(index + 6);
                // Replace closing tag if any in the same line
                line = line.replace(/<\/Input>/, '</I18nInput>');
            } else {
                // Temporary rename to avoid infinite loop on same line
                line = line.substring(0, index) + '<__IGNORE_INPUT__' + line.substring(index + 6);
            }
            
            inputMatch = line.match(/<Input\b/);
        }
        
        // Restore ignored inputs
        line = line.replace(/<__IGNORE_INPUT__/g, '<Input');
        lines[i] = line;
    }
    
    content = lines.join('\n');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Migrated ${path.basename(filePath)}`);
    }
}

if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`);
    process.exit(1);
}

const files = fs.readdirSync(directoryPath);
let migratedCount = 0;
files.forEach(file => {
    if (file.endsWith('.tsx')) {
        migrateFile(path.join(directoryPath, file));
        migratedCount++;
    }
});

console.log(`\nMigration complete! Processed ${migratedCount} files.`);
