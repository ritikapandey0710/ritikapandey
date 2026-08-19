const axios = require('axios');

// Test webhook endpoint for creating a ticket that should NOT auto-resolve via knowledge base (unknown issue)
async function testWebhookUnknownTicket() {
  try {
    const ticketData = {
      title: "Quantum Entanglement Issue",
      description: "My cat is experiencing quantum entanglement with the server causing unpredictable behavior in subspace communications.",
      senderName: "Test User",
      senderEmail: "test@example.com",
      priority: "LOW",
      category: "GENERAL_QUESTION"
    };

    console.log('Testing webhook ticket creation with unknown issue...');
    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', ticketData);
    console.log('Response:', response.data);
    console.log('Ticket created successfully!');

    // Check if ticket was auto-resolved (it shouldn't be)
    if (response.data.status === 'RESOLVED') {
      console.log('❌ Ticket was incorrectly auto-resolved via knowledge base!');
    } else {
      console.log('✅ Ticket correctly NOT auto-resolved (status:', response.data.status + ')');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWebhookUnknownTicket();