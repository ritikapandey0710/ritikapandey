const fs = require('fs');
const path = require('path');

const kbPath = path.join(process.cwd(), 'server', 'knowledge base.md');
console.log('KB Path:', kbPath);
console.log('File exists:', fs.existsSync(kbPath));

if (fs.existsSync(kbPath)) {
  const content = fs.readFileSync(kbPath, 'utf8');
  console.log('Content length:', content.length);

  // Test the parsing logic step by step
  console.log('\n=== Testing split logic ===');

  // Original logic from the service
  const sections = content.split(/^#{1,6}\s+/m).filter(Boolean);
  console.log('Sections count (original):', sections.length);
  if (sections.length > 0) {
    console.log('First section:', sections[0].substring(0, 100));
  }

  // New logic
  console.log('\n=== Testing new split logic ===');
  const sections2 = content.split(/(^#{1,6}\s+.+$)/gm);
  console.log('Sections count (new):', sections2.length);
  for (let i = 0; i < Math.min(sections2.length, 10); i++) {
    console.log(`Section ${i}:`, JSON.stringify(sections2[i].substring(0, 50)));
  }

  // Try to extract headers and content properly
  console.log('\n=== Trying header/content extraction ===');
  const lines = content.split('\n');
  let currentHeader = null;
  let currentContent = [];
  const entries = [];

  for (const line of lines) {
    if (line.match(/^#{1,6}\s+/)) {
      // Save previous entry if exists
      if (currentHeader && currentContent.length > 0) {
        entries.push({
          header: currentHeader,
          content: currentContent.join('\n')
        });
      }
      // Start new entry
      currentHeader = line.trim();
      currentContent = [];
    } else if (currentHeader !== null) {
      currentContent.push(line);
    }
  }

  // Don't forget the last entry
  if (currentHeader && currentContent.length > 0) {
    entries.push({
      header: currentHeader,
      content: currentContent.join('\n')
    });
  }

  console.log('Entries found:', entries.length);
  for (let i = 0; i < Math.min(entries.length, 3); i++) {
    console.log(`Entry ${i}:`);
    console.log('  Header:', entries[i].header);
    console.log('  Content preview:', entries[i].content.substring(0, 100));
  }
}