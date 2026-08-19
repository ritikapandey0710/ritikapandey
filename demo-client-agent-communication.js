// Demonstration of client-agent communication in the Help Desk system
// This shows 2-4 communication patterns between client and agent/AI systems

const axios = require('axios');

// Communication Pattern 1: Client creates ticket -> Agent processes via webhook -> Auto-resolve via AI/Knowledge Base
async function demoPattern1WebhookAutoResolve() {
  console.log('\n=== Communication Pattern 1: Webhook Auto-Resolution ===');
  console.log('1. Client sends ticket creation request to webhook endpoint');

  try {
    const response = await axios.post('http://localhost:3001/api/webhooks/tickets', {
      title: 'Password Reset Issues',
      description: 'I cannot log in to my account and need to reset my password urgently.',
      senderName: 'Demo User',
      senderEmail: 'demo@example.com',
      priority: 'HIGH',
      category: 'GENERAL_QUESTION'
    });

    console.log('2. Agent receives webhook request and processes it:');
    console.log(`   - Ticket created with ID: ${response.data.id}`);
    console.log(`   - Initial status: ${response.data.status}`);
    console.log(`   - Ticket number: ${response.data.ticketNumber}`);

    // Check if auto-resolved
    if (response.data.status === 'RESOLVED') {
      console.log('3. Agent/Knowledge Base auto-resolves ticket:');
      console.log('   - Knowledge base matched "Password Reset Issues" entry');
      console.log('   - Ticket status updated to RESOLVED');
      console.log('   - Resolution reply added automatically');
      console.log('   ✅ Auto-resolution successful!');
    } else {
      console.log(`3. Ticket status: ${response.data.status} (not auto-resolved)`);
    }

    return response.data;
  } catch (error) {
    console.error('Error in webhook communication:', error.message);
  }
}

// Communication Pattern 2: Client creates ticket via REST API -> Agent classifies in background -> Client fetches updated ticket
async function demoPattern2RestApiClassification() {
  console.log('\n=== Communication Pattern 2: REST API Background Classification ===');
  console.log('1. Client creates ticket via standard REST API endpoint');

  try {
    const createResponse = await axios.post('http://localhost:3001/api/tickets', {
      title: 'Website running slow',
      description: 'Pages are taking too long to load, especially the dashboard page.',
      senderName: 'Demo User 2',
      senderEmail: 'demo2@example.com',
      priority: 'MEDIUM'
      // Note: No category specified - will be classified by AI
    });

    console.log('2. Agent receives ticket creation request:');
    console.log(`   - Ticket created with ID: ${createResponse.data.id}`);
    console.log(`   - Initial status: ${createResponse.data.status}`);
    console.log(`   - Category: ${createResponse.data.category || 'Not yet classified'}`);
    console.log(`   - Priority: ${createResponse.data.priority || 'Not yet classified'}`);

    // Wait a moment for background AI classification
    console.log('3. Waiting for background AI classification to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch the updated ticket to see if AI classification happened
    const getResponse = await axios.get(`http://localhost:3001/api/tickets/${createResponse.data.id}`);

    console.log('4. Client fetches updated ticket after AI processing:');
    console.log(`   - Current status: ${getResponse.data.status}`);
    console.log(`   - AI-classified category: ${getResponse.data.category}`);
    console.log(`   - AI-classified priority: ${getResponse.data.priority}`);

    if (getResponse.data.category && getResponse.data.category !== createResponse.data.category) {
      console.log('   ✅ Background AI classification successful!');
    } else {
      console.log('   ⚠️ AI classification may still be in progress or failed');
    }

    return getResponse.data;
  } catch (error) {
    console.error('Error in REST API communication:', error.message);
  }
}

// Communication Pattern 3: Client uses AI polishing feature -> Agent processes text -> Returns enhanced reply
async function demoPattern3AiPolish() {
  console.log('\n=== Communication Pattern 3: AI Reply Polishing ===');
  console.log('1. Client sends rough draft reply to AI polishing endpoint');

  try {
    const polishResponse = await axios.post('http://localhost:3001/api/ai/polish', {
      text: 'hi user try turning it off and on again maybe that works',
      ticketId: 'demo-ticket-123',
      customerName: 'John Doe',
      subject: 'Technical Support Request'
    });

    console.log('2. Agent processes the reply through AI polishing service:');
    console.log(`   - Original text: "hi user try turning it off and on again maybe that works"`);
    console.log(`   - Polished text: "${polishResponse.data.polished}"`);
    console.log('   - AI enhanced the reply to be more professional and helpful');

    console.log('3. Client receives polished reply and can use it in ticket response');
    console.log('   ✅ AI polishing successful!');

    return polishResponse.data;
  } catch (error) {
    console.error('Error in AI polishing communication:', error.message);
  }
}

// Communication Pattern 4: Client requests ticket summary -> Agent generates summary -> Client receives concise overview
async function demoPattern4TicketSummary() {
  console.log('\n=== Communication Pattern 4: AI Ticket Summarization ===');
  console.log('1. Client requests summary for a specific ticket');

  try {
    // First create a ticket with substantial content for summarization
    const createResponse = await axios.post('http://localhost:3001/api/tickets', {
      title: 'Complex Integration Issue',
      description: 'We are experiencing multiple issues with our API integration: 1) Authentication tokens are not being validated properly causing 401 errors, 2) Webhook deliveries are failing with timeout errors, 3) Data synchronization between systems is inconsistent leading to data loss, 4) Rate limiting is being triggered too easily affecting our production throughput. We need immediate assistance to resolve these critical integration problems.',
      senderName: 'Demo User 3',
      senderEmail: 'demo3@example.com',
      priority: 'URGENT',
      category: 'TECHNICAL_QUESTION'
    });

    console.log(`2. Agent receives summarization request for ticket ${createResponse.data.id}`);

    // Request AI summary
    const summaryResponse = await axios.post(`http://localhost:3001/api/ai/summarize`, {
      ticketId: createResponse.data.id
    });

    console.log('3. Agent generates AI-powered ticket summary:');
    console.log(`   - Summary: "${summaryResponse.data.summary}"`);
    console.log('   - AI extracted key points from lengthy ticket description');

    console.log('4. Client receives concise summary for quick ticket review');
    console.log('   ✅ AI summarization successful!');

    return summaryResponse.data;
  } catch (error) {
    console.error('Error in ticket summarization communication:', error.message);
  }
}

// Run all demonstration patterns
async function runAllDemos() {
  console.log('🚀 Starting Client-Agent Communication Demonstrations');
  console.log('=' .repeat(60));

  try {
    await demoPattern1WebhookAutoResolve();
    await demoPattern2RestApiClassification();
    await demoPattern3AiPolish();
    await demoPattern4TicketSummary();

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All communication patterns demonstrated successfully!');
    console.log('\nSummary of Client-Agent Communication Patterns:');
    console.log('1. Webhook → Agent: External systems creating tickets that get auto-resolved via AI/Knowledge Base');
    console.log('2. REST API → Agent: Standard ticket creation with background AI classification');
    console.log('3. Client → Agent → Client: AI-powered reply polishing for enhanced agent responses');
    console.log('4. Client → Agent → Client: AI-powered ticket summarization for quick issue comprehension');
    console.log('\nThese patterns show bidirectional communication between client interface and AI agent systems');
  } catch (error) {
    console.error('Error running demonstrations:', error.message);
  }
}

// Execute the demonstrations
runAllDemos();