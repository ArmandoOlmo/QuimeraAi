const fs = require('fs');
const glob = require('glob');

const files = glob.sync('components/*Neon.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove getFontStack logic
    content = content.replace(/const headlineFontFamily.*?\n/g, '');
    content = content.replace(/const subheadlineFontFamily.*?\n/g, '');

    // Replace fontFamily: headlineFontFamily
    content = content.replace(/fontFamily:\s*headlineFontFamily,?\s*/g, '');
    content = content.replace(/fontFamily:\s*subheadlineFontFamily,?\s*/g, '');

    // Add font classes if missing
    // For h1-h6
    content = content.replace(/<(h[1-6])([^>]*)className="([^"]*)"/g, (match, tag, before, cls) => {
        if (!cls.includes('font-header')) cls += ' font-header';
        return `<${tag}${before}className="${cls}"`;
    });
    
    // For p
    content = content.replace(/<p([^>]*)className="([^"]*)"/g, (match, before, cls) => {
        if (!cls.includes('font-body')) cls += ' font-body';
        return `<p${before}className="${cls}"`;
    });

    // Add inline styles for buttons
    content = content.replace(/<button([^>]*)className="([^"]*)"/g, (match, before, cls) => {
        if (!cls.includes('font-button')) cls += ' font-button';
        return `<button${before}className="${cls}"`;
    });

    // Write back
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
});
