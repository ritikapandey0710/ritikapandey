const axios = require('axios');

// Test webhook endpoint for creating a ticket with a question NOT in the knowledge base
// The knowledge base covers: password reset, account access, billing, refunds, technical errors,
// performance, API/integration issues, data export, feature requests (dark mode), documentation,
// training, security, service outages, mobile app, and data privacy.
//
// This question is about "Satellite communication gateway configuration" - a topic with no
// knowledge base entry. Verified via test-kb-score.js that it scores only 24 (< 35 threshold).

async function testTicketNotInKB() {
  try {
    const ticketData = {
      title: "Satellite communication gateway configuration",
      description: "I need to configure the satellite uplink gateway for our remote location. The transceiver firmware version is outdated and I'm looking for guidance on updating the satellite modem firmware to the latest supported release for our geographic region.",
      senderName: "Robert Chen",
      senderEmail: "rchen@aeroindustries.com",
      priority: "HIGH",
      category: "TECHNICAL_QUESTION"
    };

    console.log('Creating ticket with a question NOT in the knowledge base...');
    console.log(`Title: "${ticketData.title}"`);
    console.log('');

    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', ticketData);
    const ticket = response.data;

    console.log('✅ Ticket created successfully!');
    console.log('Ticket ID:', ticket.id);
    console.log('Status:', ticket.status);
    console.log('Title:', ticket.title);
    console.log('Category:', ticket.category);
    console.log('Priority:', ticket.priority);
    console.log('Sender:', ticket.senderName, '<' + ticket.senderEmail + '>');
    console.log('Description:', ticket.description);
    console.log('');

    // Check the ticket status - since the question is NOT in the knowledge base,
    // the ticket should be OPEN (not auto-resolved)
    if (ticket.status === 'RESOLVED') {
      console.log('❌ WARNING: Ticket was auto-resolved! This means the question was found in the knowledge base.');
    } else if (ticket.status === 'OPEN') {
      console.log('✅ Ticket status is OPEN - confirmed the question is NOT in the knowledge base.');
      console.log('   (Ticket was kept open for human handling since no KB match was found.)');
    } else if (ticket.status === 'PROCESSING') {
      console.log('⚠️ Ticket status is PROCESSING - AI is still working on it. Check again shortly.');
    } else {
      console.log('⚠️ Ticket status:', ticket.status);
    }
    console.log('');
    console.log('To confirm via DB, you can also query:');
    console.log(`  SELECT * FROM Ticket WHERE id = '${ticket.id}';`);
  } catch (error) {
    console.error('Error creating ticket:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nThe server appears to be down. Please start the server first with:');
      console.error('  cd server && npm run dev');
    }
  }
}

testTicketNotInKB();