const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let updatedCount = 0;

walkDir('/Users/armandoolmo/Desktop/QuimeraAi/QuimeraAi/components', (file) => {
  if (!file.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  const initialContent = content;

  // Patterns for replacing exactly border-[dir] border-border (and nothing else after)
  const regexPatterns = [
    { from: /border\-b border\-border(?=[ \"\n}])/g, to: 'border-b border-border/50' },
    { from: /border\-t border\-border(?=[ \"\n}])/g, to: 'border-t border-border/50' },
    { from: /border\-r border\-border(?=[ \"\n}])/g, to: 'border-r border-border/50' },
    { from: /border\-l border\-border(?=[ \"\n}])/g, to: 'border-l border-border/50' },
    { from: /divide\-border(?=[ \"\n}])/g, to: 'divide-border/50' },
    { from: /divide\-y divide\-border(?=[ \"\n}])/g, to: 'divide-y divide-border/50' },
    { from: /divide\-x divide\-border(?=[ \"\n}])/g, to: 'divide-x divide-border/50' }
  ];

  for (const {from, to} of regexPatterns) {
    content = content.replace(from, to);
  }

  const regexPatternsReverse = [
    { from: /border\-border border\-b(?=[ \"\n}])/g, to: 'border-border/50 border-b' },
    { from: /border\-border border\-t(?=[ \"\n}])/g, to: 'border-border/50 border-t' },
    { from: /border\-border border\-r(?=[ \"\n}])/g, to: 'border-border/50 border-r' },
    { from: /border\-border border\-l(?=[ \"\n}])/g, to: 'border-border/50 border-l' },
  ];

  for (const {from, to} of regexPatternsReverse) {
    content = content.replace(from, to);
  }

  if (content !== initialContent) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log(`Updated borders in: ${file.split('QuimeraAi/components/')[1]}`);
  }
});

console.log(`\nFixed internal divider lines in ${updatedCount} files to use 50% opacity uniformly.`);
