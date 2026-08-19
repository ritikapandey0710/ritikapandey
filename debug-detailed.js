const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Reading knowledge base from:', kbPath);
const content = fs.readFileSync(kbPath, 'utf8');

// Get first section
const sections = content.split(/^---$/gm);
const firstSection = sections[0].trim();
const lines = firstSection.split('\n');

console.log('=== DETAILED LINE-BY-LINE ANALYSIS ===');
for (let i = 0; i < lines.length; i++) {
  console.log(`${i.toString().padStart(2, ' ')}: [${JSON.stringify(lines[i])}] (trimmed: ${JSON.stringify(lines[i].trim())})`);
}

console.log('\n=== TESTING THE LOGIC ===');
let title = '';
let titleIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('# ')) {
    title = lines[i].trim().substring(2).trim();
    titleIndex = i;
    console.log(`Found title at index ${i}: "${title}"`);
    break;
  }
}

let category = '';
let keywords = [];

console.log('\nScanning for Category and Keywords:');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  console.log(`Checking line ${i}: ${JSON.stringify(line)}`);

  if (line.startsWith('**Category:**')) {
    console.log(`  -> MATCHED Category pattern`);
    if (i + 1 < lines.length) {
      const value = lines[i + 1].trim();
      console.log(`  -> Next line (${i+1}): ${JSON.stringify(value)}`);
      category = value;
      console.log(`  -> Set category to: ${JSON.stringify(category)}`);
    } else {
      console.log(`  -> No next line!`);
    }
  } else if (line.startsWith('**Keywords:**')) {
    console.log(`  -> MATCHED Keywords pattern`);
    if (i + 1 < lines.length) {
      const value = lines[i + 1].trim();
      console.log(`  -> Next line (${i+1}): ${JSON.stringify(value)}`);
      const keywordsArr = value
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);
      console.log(`  -> Parsed keywords: ${JSON.stringify(keywordsArr)}`);
      keywords = keywordsArr;
    } else {
      console.log(`  -> No next line!`);
    }
  }
}

console.log(`\nRESULT:`);
console.log(`  Title: "${title}"`);
console.log(`  Category: "${category}"`);
console.log(`  Keywords: ${JSON.stringify(keywords)}`);