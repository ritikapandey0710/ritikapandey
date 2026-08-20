const { signedPost } = require('./webhook-test-helper.cjs');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base for technical error
async function testWebhookTicket() {
  try {
    const ticketData = {
      title: "Application Crash on Startup",
      description: "The application crashes or closes unexpectedly on startup when I try to open it. I keep getting error messages indicating application failure.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "HIGH",
      category: "TECHNICAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with technical error (application crash)...');
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