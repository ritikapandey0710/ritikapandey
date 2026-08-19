const axios = require('axios');

// Fresh test to verify auto-resolution is working
async function testFresh() {
  try {
    const ticketData = {
      title: "Password Reset Issues",
      description: "I forgot my password and need to reset it. I'm unable to log in to my account.",
      senderName: "Fresh Test User",
      senderEmail: "fresh@example.com",
      priority: "MEDIUM",
      category: "GENERAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with fresh data...');
    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', ticketData);
    console.log('Response status:', response.data.status);
    console.log('Full response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'RESOLVED') {
      console.log('✅ SUCCESS: Ticket was auto-resolved via knowledge base!');
      return true;
    } else {
      console.log('❌ FAILURE: Ticket was NOT auto-resolved');
      return false;
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

// Run multiple tests to be sure
async function runTests() {
  console.log('Running multiple tests to verify auto-resolution...\n');

  let passed = 0;
  const total = 3;

  for (let i = 0; i < total; i++) {
    console.log(`--- Test ${i + 1} of ${total} ---`);
    const result = await testFresh();
    if (result) passed++;
    console.log('');
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`=== RESULTS: ${passed}/${total} tests passed ===\n`);
  if (passed === total) {
    console.log('🎉 All tests passed! Auto-resolution is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. There may be an issue with auto-resolution.');
  }
}

runTests();