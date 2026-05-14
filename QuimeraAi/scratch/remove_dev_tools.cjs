const fs = require('fs');
const filePath = 'components/dashboard/admin/AdminAssetLibrary.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove isMigrating, setIsMigrating, isScanning, setIsScanning
content = content.replace(/const \[isMigrating, setIsMigrating\] = useState\(false\);\n?/, '');
content = content.replace(/const \[isScanning, setIsScanning\] = useState\(false\);\n?/, '');

// 2. Remove handleMigrateAssets
const start1 = content.indexOf('const handleMigrateAssets = async () => {');
if (start1 !== -1) {
    // Find the matching closing brace
    let braces = 0;
    let end1 = start1;
    for (let i = start1; i < content.length; i++) {
        if (content[i] === '{') braces++;
        if (content[i] === '}') {
            braces--;
            if (braces === 0) {
                end1 = i + 1;
                break;
            }
        }
    }
    // Also remove preceding comment
    const commentStart = content.lastIndexOf('// DEV TOOL:', start1);
    if (commentStart !== -1 && commentStart > start1 - 100) {
        content = content.substring(0, commentStart) + content.substring(end1);
    } else {
        content = content.substring(0, start1) + content.substring(end1);
    }
}

// 3. Remove scanAndExtractBase64FromArticles
const start2 = content.indexOf('const scanAndExtractBase64FromArticles = async () => {');
if (start2 !== -1) {
    let braces = 0;
    let end2 = start2;
    for (let i = start2; i < content.length; i++) {
        if (content[i] === '{') braces++;
        if (content[i] === '}') {
            braces--;
            if (braces === 0) {
                end2 = i + 1;
                break;
            }
        }
    }
    content = content.substring(0, start2) + content.substring(end2);
}

// 4. Remove migrateLegacyAIAssets
const start3 = content.indexOf('const migrateLegacyAIAssets = async () => {');
if (start3 !== -1) {
    let braces = 0;
    let end3 = start3;
    for (let i = start3; i < content.length; i++) {
        if (content[i] === '{') braces++;
        if (content[i] === '}') {
            braces--;
            if (braces === 0) {
                end3 = i + 1;
                break;
            }
        }
    }
    content = content.substring(0, start3) + content.substring(end3);
}

// 5. Remove the buttons
const buttonsRegex = /<button[^>]*onClick=\{scanAndExtractBase64FromArticles\}[^>]*>[\s\S]*?<\/button>\s*<button[^>]*onClick=\{migrateLegacyAIAssets\}[^>]*>[\s\S]*?<\/button>/g;
content = content.replace(buttonsRegex, '');

fs.writeFileSync(filePath, content);
console.log('Removed dev tools');
