const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Reading knowledge base from:', kbPath);
const content = fs.readFileSync(kbPath, 'utf8');
console.log('File loaded, length:', content.length);

// Let's see what we get when we split by '---' (with newlines)
console.log('\n=== Splitting by /^---$/gm ===');
const sections = content.split(/^---$/gm);
console.log('Number of sections:', sections.length);
for (let i = 0; i < Math.min(sections.length, 5); i++) {
  console.log(`Section ${i} length:`, sections[i].length);
  console.log(`Section ${i} preview:`, JSON.stringify(sections[i].substring(0, 200)));
}

// Let's look at the actual content structure
console.log('\n=== Looking at raw content around first few sections ===');
const lines = content.split('\n');
for (let i = 0; i < Math.min(30, lines.length); i++) {
  console.log(`${i.toString().padStart(2, '0')}: ${JSON.stringify(lines[i])}`);
}