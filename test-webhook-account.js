const { signedPost } = require('./webhook-test-helper.cjs');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base (account access issue)
async function testWebhookAccountTicket() {
  try {
    const ticketData = {
      title: "Account Access/Login Issues",
      description: "I cannot access my account. The login page fails to load or times out.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "MEDIUM",
      category: "GENERAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with account access issue...');
    const response = await signedPost('http://localhost:3001/api/webhooks/tickets', ticketData);
    console.log('Response:', response.data);
    console.log('Ticket created successfully!');

    // Check if ticket was auto-resolved
    if (response.data.status === 'RESOLVED') {
      console.log('✅ Ticket was auto-resolved via knowledge base!');
    } else {
      console.log('⚠️ Ticket status:', response.data.status);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWebhookAccountTicket();