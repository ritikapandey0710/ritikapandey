const axios = require('axios');

// Test webhook endpoint for creating a ticket that should auto-resolve via knowledge base (technical issue)
async function testWebhookTechnicalTicket() {
  try {
    const ticketData = {
      title: "Error 500 when submitting forms",
      description: "I encounter Error 500 when trying to submit any form on the website. The application crashes or closes unexpectedly on startup.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "HIGH",
      category: "TECHNICAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with technical error...');
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

testWebhookTechnicalTicket();