const fs = require('fs');
const path = require('path');

const dir = 'components/quimera';
const files = fs.readdirSync(dir).filter(f => f.endsWith('Quimera.tsx'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    // We are looking to replace \` with `
    const newContent = content.replace(/\\`/g, '`');
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log('Fixed', file);
    }
});
