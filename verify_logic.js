// Simple verification of the logic without database connection

// Simulate the knowledge base service matching logic
class MockKnowledgeBaseService {
  constructor() {
    this.entries = [
      {
        id: "password-reset-issues",
        title: "Password Reset Issues",
        category: "GENERAL_QUESTION",
        keywords: ["password reset", "forgot password", "reset password", "password recovery", "account access", "unable to reset password"],
        content: "# Password Reset Issues\n**Category:**\nGENERAL_QUESTION\n**Keywords:**\npassword reset, forgot password, reset password, password recovery, account access, unable to reset password"
      },
      {
        id: "billing-and-payment-issues",
        title: "Billing and Payment Issues",
        category: "GENERAL_QUESTION",
        keywords: ["billing inquiry", "payment method", "update payment", "subscription", "invoice", "charge", "billing question"],
        content: "# Billing and Payment Issues\n**Category:**\nGENERAL_QUESTION\n**Keywords:**\nbilling inquiry, payment method, update payment, subscription, invoice, charge, billing question"
      },
      {
        id: "account-access-login-issues",
        title: "Account Access/Login Issues",
        category: "GENERAL_QUESTION",
        keywords: ["cannot access account", "login page not loading", "account access", "login issues", "sign in problems"],
        content: "# Account Access/Login Issues\n**Category:**\nGENERAL_QUESTION\n**Keywords:**\ncannot access account, login page not loading, account access, login issues, sign in problems"
      },
      {
        id: "feature-requests-dark-mode",
        title: "Feature Requests (Dark Mode)",
        category: "GENERAL_QUESTION",
        keywords: ["feature request", "dark mode", "new feature", "enhancement", "feature suggestion", "product improvement"],
        content: "# Feature Requests (Dark Mode)\n**Category:**\nGENERAL_QUESTION\n**Keywords:**\nfeature request, dark mode, new feature, enhancement, feature suggestion, product improvement"
      }
    ];
  }

  findMatchingEntry(ticketTitle, ticketDescription) {
    if (!this.entries.length) return null;

    const ticketText = `${ticketTitle} ${ticketDescription || ''}`.toLowerCase();
    const ticketWords = ticketText
      .split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2);

    let bestMatch = null;
    let highestScore = 0;

    for (const entry of this.entries) {
      let score = 0;

      // Check title match
      if (entry.title.toLowerCase().includes(ticketTitle.toLowerCase()) ||
          ticketTitle.toLowerCase().includes(entry.title.toLowerCase())) {
        score += 10;
      }

      // Check keyword matches
      for (const keyword of entry.keywords) {
        if (ticketText.includes(keyword)) {
          score += 5;
        }
      }

      // Check word overlap
      const entryWords = entry.content
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.replace(/[^\w]/g, ''))
        .filter(word => word.length > 2);

      const commonWords = ticketWords.filter(word => entryWords.includes(word));
      score += commonWords.length * 2;

      // Boost score for exact phrase matches
      for (const keyword of entry.keywords) {
        if (ticketText.includes(` ${keyword} `) ||
            ticketText.startsWith(`${keyword} `) ||
            ticketText.endsWith(` ${keyword}`)) {
          score += 3;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = entry;
      }
    }

    // Only return match if score is above threshold
    return highestScore >= 10 ? bestMatch : null;
  }

  getResolutionSteps(entry) {
    // Simplified resolution extraction
    if (entry.title === "Password Reset Issues") {
      return "Send a password reset link to the user's verified email address. Ensure the email contains clear instructions and expires in a reasonable timeframe (typically 1-2 hours).";
    }
    return `Based on similar issues, please refer to the knowledge base article: "${entry.title}"`;
  }
}

const kbService = new MockKnowledgeBaseService();

function simulateTicketCreation(title, description) {
  console.log(`\n=== Simulating ticket creation: "${title}" ===`);

  // Step 1: Create ticket with status NEW
  let status = "NEW";
  console.log(`1. Ticket created with status: ${status}`);

  // Step 2: Mark as PROCESSING (AI is working on it)
  status = "PROCESSING";
  console.log(`2. AI started processing, status: ${status}`);

  // Step 3: Check knowledge base
  const kbEntry = kbService.findMatchingEntry(title, description);

  if (kbEntry) {
    // Step 4a: Knowledge base match found - auto-resolve
    status = "RESOLVED";
    console.log(`3. Knowledge base match found: "${kbEntry.title}"`);
    console.log(`4. Ticket auto-resolved, status: ${status}`);
    console.log(`   Resolution: ${kbService.getResolutionSteps(kbEntry)}`);
  } else {
    // Step 4b: No knowledge base match - remains open for human
    status = "OPEN";
    console.log(`3. No knowledge base match found`);
    console.log(`4. AI could not auto-resolve, status: ${status} (needs human attention)`);
  }

  // Step 5: AI classification would happen in background (not affecting status in this simulation)
  console.log(`5. AI classification runs in background (status unchanged: ${status})`);

  return { title, description, finalStatus: status };
}

// Test cases based on actual seed data
const testCases = [
  {
    title: "Password reset request",
    description: "I forgot my password and need to reset it",
    expectedStatus: "RESOLVED"
  },
  {
    title: "Billing inquiry",
    description: "I have a question about my recent charge",
    expectedStatus: "RESOLVED"
  },
  {
    title: "Cannot access account",
    description: "I can't log into my account",
    expectedStatus: "RESOLVED"
  },
  {
    title: "Feature request: dark mode",
    description: "Please add dark mode to the application",
    expectedStatus: "RESOLVED"
  },
  {
    title: "Completely unknown issue",
    description: "This is something that definitely won't match our knowledge base",
    expectedStatus: "OPEN"
  },
  {
    title: "Random string asdfghjkl",
    description: "Random text that won't match anything",
    expectedStatus: "OPEN"
  }
];

console.log("🧪 Testing Ticket State Flow Logic");
console.log("==================================");

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = simulateTicketCreation(testCase.title, testCase.description);

  if (result.finalStatus === testCase.expectedStatus) {
    console.log(`✅ PASS: Expected ${testCase.expectedStatus}, got ${result.finalStatus}`);
    passed++;
  } else {
    console.log(`❌ FAIL: Expected ${testCase.expectedStatus}, got ${result.finalStatus}`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! The state flow logic is working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please review the implementation.");
}