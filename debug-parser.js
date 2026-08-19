const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'knowledge base.md');
console.log('Reading file:', filePath);

const content = fs.readFileSync(filePath, 'utf8');
console.log('File length:', content.length);

// Let's examine the first 500 characters to see the structure
console.log('\n=== First 500 chars ===');
console.log(content.substring(0, 500));

// Let's see what we get when we split by '---' (with newlines)
console.log('\n=== Splitting by /^---\s*$/gm ===');
const sections = content.split(/^---\s*$/gm);
console.log('Number of sections:', sections.length);
for (let i = 0; i < Math.min(sections.length, 5); i++) {
  console.log(`Section ${i} length:`, sections[i].length);
  console.log(`Section ${i} preview:`, JSON.stringify(sections[i].substring(0, 200)));
}

// Now let's try to parse one section properly
if (sections.length > 0) {
  const firstSection = sections[0].trim();
  console.log('\n=== First section (trimmed) ===');
  console.log(firstSection);

  // Now split this section into lines
  const lines = firstSection.split('\n');
  console.log(`\nLines in first section: ${lines.length}`);
  for (let j = 0; j < Math.min(lines.length, 20); j++) {
    console.log(`${j}: ${JSON.stringify(lines[j])}`);
  }

  // Look for the header line (starts with #)
  let headerLine = null;
  let headerIndex = -1;
  for (let j = 0; j < lines.length; j++) {
    if (lines[j].trim().startsWith('#')) {
      headerLine = lines[j].trim();
      headerIndex = j;
      break;
    }
  }

  if (headerLine) {
    console.log(`\nFound header: ${headerLine}`);
    const title = headerLine.replace(/^#\s+/, '').trim();
    console.log(`Extracted title: ${title}`);

    // Now look for Category and Keywords in the remaining lines
    let category = '';
    let keywords = [];
    for (let j = headerIndex + 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.startsWith('**Category:**')) {
        category = line.replace('**Category:**', '').trim();
        console.log(`Found category: ${category}`);
      } else if (line.startsWith('**Keywords:**')) {
        const keywordsStr = line.replace('**Keywords:**', '').trim();
        keywords = keywordsStr
          .split(',')
          .map(k => k.trim().toLowerCase())
          .filter(Boolean);
        console.log(`Found keywords: ${keywords}`);
      }
    }

    console.log(`\nParsed entry:`);
    console.log(`  Title: ${title}`);
    console.log(`  Category: ${category}`);
    console.log(`  Keywords: ${keywords}`);
  } else {
    console.log('\nNo header line found in first section!');
  }
}