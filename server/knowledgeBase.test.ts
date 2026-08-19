import { KnowledgeBaseService } from './src/services/knowledgeBaseService';

// Test the knowledge base service
const kbService = new KnowledgeBaseService();

console.log('Testing Knowledge Base Service...');
console.log(`Loaded ${kbService.entries.length} entries`);

// Test finding matching entries
const testCases = [
  {
    title: "Password reset request",
    description: "I forgot my password and need to reset it",
    expected: "Password Reset Issues"
  },
  {
    title: "Cannot access account",
    description: "I can't log into my account",
    expected: "Account Access/Login Issues"
  },
  {
    title: "Billing inquiry",
    description: "I have a question about my recent charge",
    expected: "Billing and Payment Issues"
  },
  {
    title: "Error 500 when submitting form",
    description: "Getting server error when trying to submit",
    expected: "Technical Errors (500, Crashes, Display Issues)"
  },
  {
    title: "Feature request: dark mode",
    description: "Please add dark mode to the application",
    expected: "Feature Requests (Dark Mode)"
  }
];

testCases.forEach(({title, description, expected}) => {
  const match = kbService.findMatchingEntry(title, description);
  if (match) {
    console.log(`✓ "${title}" -> "${match.title}"`);
    if (match.title !== expected) {
      console.log(`  Expected: "${expected}", Got: "${match.title}"`);
    }
  } else {
    console.log(`✗ "${title}" -> No match found`);
  }
});

console.log('\nKnowledge base service test completed.');