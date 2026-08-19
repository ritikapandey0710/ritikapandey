// Test using the actual knowledgeBaseService instance from the server
const { knowledgeBaseService } = require('./server/src/services/knowledgeBaseService');

// Wait a moment for the service to initialize
setTimeout(() => {
  console.log('Number of KB entries loaded:', knowledgeBaseService.entries.length);

  if (knowledgeBaseService.entries.length > 0) {
    console.log('First entry:', JSON.stringify(knowledgeBaseService.entries[0], null, 2));
    console.log('Second entry:', JSON.stringify(knowledgeBaseService.entries[1], null, 2));
  } else {
    console.log('KB path used:', knowledgeBaseService.kbPath);
    const fs = require('fs');
    const path = require('path');
    console.log('File exists:', fs.existsSync(knowledgeBaseService.kbPath));
    if (fs.existsSync(knowledgeBaseService.kbPath)) {
      const content = fs.readFileSync(knowledgeBaseService.kbPath, 'utf8');
      console.log('File length:', content.length);
      console.log('First 200 chars:', content.substring(0, 200));
    }
  }

  // Test matching
  const testCases = [
    { title: "I forgot my password", description: "I cannot log in because I forgot my password and need to reset it" },
    { title: "Password reset request", description: "I need to reset my password but I'm not receiving the reset email" },
    { title: "I need to update my payment method", description: "My credit card expired and I need to update my payment method on file for my subscription" },
    { title: "Cannot access account", description: "I'm unable to log into my account" }
  ];

  for (const testCase of testCases) {
    const match = knowledgeBaseService.findMatchingEntry(testCase.title, testCase.description);
    console.log(`\nTesting: "${testCase.title}"`);
    if (match) {
      console.log(`✓ Matched: "${match.title}" (${match.category})`);
      // Show resolution steps
      const resolutionSteps = knowledgeBaseService.getResolutionSteps(match);
      console.log(`  Resolution steps: ${resolutionSteps.substring(0, 100)}...`);
    } else {
      console.log(`✗ No match found`);
    }
  }
}, 2000); // Wait 2 seconds for service to initialize