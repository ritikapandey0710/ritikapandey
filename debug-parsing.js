const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Reading knowledge base from:', kbPath);
const content = fs.readFileSync(kbPath, 'utf8');
console.log('File loaded, length:', content.length);

// Test the parsing logic step by step
console.log('\n=== Testing split logic ===');
const sections = content.split(/^---$/gm);
console.log('Number of sections:', sections.length);

for (let i = 0; i < Math.min(sections.length, 3); i++) {
  console.log(`\n--- Section ${i} ---`);
  console.log('Raw section:', JSON.stringify(sections[i]));

  const trimmed = sections[i].trim();
  console.log('Trimmed section:', JSON.stringify(trimmed));

  if (!trimmed) {
    console.log('Section is empty after trim');
    continue;
  }

  const lines = trimmed.split('\n');
  console.log('Number of lines:', lines.length);

  // Show first 10 lines
  for (let j = 0; j < Math.min(lines.length, 10); j++) {
    console.log(`${j}: ${JSON.stringify(lines[j])}`);
  }

  // Now try to parse this section
  let title = '';
  let titleIndex = -1;

  for (let j = 0; j < lines.length; j++) {
    if (lines[j].trim().startsWith('# ')) {
      title = lines[j].trim().substring(2).trim();
      titleIndex = j;
      console.log(`Found title at line ${j}: "${title}"`);
      break;
    }
  }

  if (!title) {
    console.log('No title found!');
    continue;
  }

  let category = '';
  let keywords = [];

  for (let j = titleIndex + 1; j < lines.length; j++) {
    const line = lines[j].trim();
    if (line.startsWith('**Category:**')) {
      category = line.replace('**Category:**', '').trim();
      console.log(`Found category at line ${j}: "${category}"`);
    } else if (line.startsWith('**Keywords:**')) {
      const keywordsStr = line.replace('**Keywords:**', '').trim();
      keywords = keywordsStr
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);
      console.log(`Found keywords at line ${j}: [${keywords.slice(0, 3).join(', ')}...]`);
    }
  }

  console.log(`Result: title="${title}", category="${category}", keywords length=${keywords.length}`);

  if (title && category) {
    console.log('✓ VALID ENTRY');
  } else {
    console.log('✗ INVALID ENTRY');
  }
}