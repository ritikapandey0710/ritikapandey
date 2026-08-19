const axios = require('axios');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base (billing/payment issue)
async function testWebhookBillingTicket() {
  try {
    const ticketData = {
      title: "Billing and Payment Issues",
      description: "I have a billing inquiry regarding an unexpected charge on my invoice. I need to update my payment method on file and have questions about my subscription plan and billing cycle. This billing question is about a charge I don't recognize on my latest statement.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "MEDIUM",
      category: "GENERAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with billing & payment issue...');
    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', ticketData);
    console.log('Response:', JSON.stringify(response.data, null, 2));
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

testWebhookBillingTicket();
