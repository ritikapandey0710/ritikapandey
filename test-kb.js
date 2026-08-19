const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Reading knowledge base from:', kbPath);
const content = fs.readFileSync(kbPath, 'utf8');
console.log('File loaded, length:', content.length);

// Test the parsing logic
const sections = content.split(/^---$/gm);
console.log('Number of sections:', sections.length);

let validEntries = 0;
for (let i = 0; i < sections.length; i++) {
  const section = sections[i].trim();
  if (!section) continue;

  const lines = section.split('\n');
  let title = '';
  let titleIndex = -1;

  for (let j = 0; j < lines.length; j++) {
    if (lines[j].trim().startsWith('# ')) {
      title = lines[j].trim().substring(2).trim();
      titleIndex = j;
      break;
    }
  }

  if (!title) continue;

  let category = '';
  let keywords = [];

  for (let j = titleIndex + 1; j < lines.length; j++) {
    const line = lines[j].trim();
    if (line.startsWith('**Category:**')) {
      category = line.replace('**Category:**', '').trim();
    } else if (line.startsWith('**Keywords:**')) {
      const keywordsStr = line.replace('**Keywords:**', '').trim();
      keywords = keywordsStr
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  if (title && category) {
    validEntries++;
    console.log('Entry ' + validEntries + ': "' + title + '" (' + category + ') - Keywords: ' + keywords.slice(0, 3).join(', '));
  }
}

console.log('');
console.log('Total valid entries found: ' + validEntries);