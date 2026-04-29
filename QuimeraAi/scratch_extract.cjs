const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'components/quimera');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf-8');
  const interfaceMatch = content.match(/interface \w+Props \{[\s\S]*?\n\}/g);
  if (interfaceMatch) {
    console.log(`\n--- ${f} ---`);
    console.log(interfaceMatch.join('\n\n'));
  }
});
