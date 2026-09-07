const fs = require('fs');
const content = fs.readFileSync('seed.ts', 'utf-8');
const lines = content.split('\n');
const newLines = [...lines.slice(0, 156), ...lines.slice(1433)];
fs.writeFileSync('seed.ts', newLines.join('\n'));
