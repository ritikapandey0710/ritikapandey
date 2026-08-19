// Direct test of the KnowledgeBaseService from the server code
const { KnowledgeBaseService } = require('./server/src/services/knowledgeBaseService');

// Create instance and test
const kb = new KnowledgeBaseService();

console.log('Number of KB entries loaded:', kb.entries.length);
if (kb.entries.length > 0) {
  console.log('First entry:', JSON.stringify(kb.entries[0], null, 2));
} else {
  console.log('KB path used:', kb.kbPath);
  const fs = require('fs');
  const path = require('path');
  console.log('File exists:', fs.existsSync(kb.kbPath));
  if (fs.existsSync(kb.kbPath)) {
    const content = fs.readFileSync(kb.kbPath, 'utf8');
    console.log('File length:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));
  }
}

// Test matching
const testCases = [
  { title: "I forgot my password", description: "I cannot log in because I forgot my password and need to reset it" },
  { title: "Password reset request", description: "I need to reset my password but I'm not receiving the reset email" },
  { title: "Cannot access account", description: "I'm unable to log into my account" }
];

for (const testCase of testCases) {
  const match = kb.findMatchingEntry(testCase.title, testCase.description);
  console.log(`\nTesting: "${testCase.title}"`);
  if (match) {
    console.log(`✓ Matched: "${match.title}" (${match.category})`);
  } else {
    console.log(`✗ No match found`);
  }
}