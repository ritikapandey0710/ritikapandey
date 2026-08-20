const { signedPost } = require('./webhook-test-helper.cjs');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base
async function testWebhookTicket() {
  try {
    const ticketData = {
      title: "Password Reset Issues",
      description: "I forgot my password and need to reset it. I'm unable to log in to my account.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "MEDIUM",
      category: "GENERAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with password reset issue...');
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

testWebhookTicket();