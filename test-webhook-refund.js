const axios = require('axios');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base for refund request
async function testWebhookTicket() {
  try {
    const ticketData = {
      title: "Refund Request",
      description: "I want a refund for my last order because I'm dissatisfied with the service. Please return funds to my original payment method.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "MEDIUM",
      category: "REFUND_REQUEST"
    };

    console.log('Testing webhook ticket creation with refund request...');
    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', ticketData);
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