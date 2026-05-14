const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'functions' || file === '.gemini') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Replaces
            content = content.replace(/user\.uid/g, 'user.id');
            content = content.replace(/user\?\.uid/g, 'user?.id');
            content = content.replace(/authUser\.uid/g, 'authUser.id');
            content = content.replace(/authUser\?\.uid/g, 'authUser?.id');
            
            // Specific type fixes like: authUser: { uid: string; ... }
            content = content.replace(/uid: string/g, 'id: string');
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

const basePath = '/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi';
const dirs = ['contexts', 'components', 'hooks', 'utils', 'services', 'routes'];

for (const dir of dirs) {
    processDir(path.join(basePath, dir));
}

console.log("Done");
