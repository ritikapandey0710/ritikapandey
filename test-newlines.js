const axios = require('axios');

// Test to check if newlines are preserved in ticket creation and retrieval
async function testNewlines() {
  try {
    // Login first to get auth token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@test.com',
      password: 'password'
    }, {
      withCredentials: true
    });

    console.log('Login successful');

    // Create a ticket with newlines in description
    const ticketData = {
      title: "Test Newlines",
      description: "Line 1\nLine 2\nLine 3\n\nLine 5 (after blank line)",
      senderName: "Test User",
      senderEmail: "test@example.com"
    };

    console.log('Creating ticket with newlines in description...');
    const createResponse = await axios.post('http://localhost:3001/api/tickets', ticketData, {
      withCredentials: true
    });

    console.log('Ticket created:', createResponse.data);
    console.log('Description as received:', JSON.stringify(createResponse.data.description));

    // Fetch the ticket back
    console.log('Fetching ticket back...');
    const getResponse = await axios.get(`http://localhost:3001/api/tickets/${createResponse.data.id}`, {
      withCredentials: true
    });

    console.log('Ticket fetched:', getResponse.data);
    console.log('Description as fetched:', JSON.stringify(getResponse.data.description));

    // Check if newlines are preserved
    const originalDesc = ticketData.description;
    const fetchedDesc = getResponse.data.description;

    if (originalDesc === fetchedDesc) {
      console.log('✅ Newlines preserved correctly!');
    } else {
      console.log('❌ Newlines not preserved');
      console.log('Original:', JSON.stringify(originalDesc));
      console.log('Fetched:', JSON.stringify(fetchedDesc));
    }

    // Create a reply with newlines
    const replyData = {
      body: "Reply line 1\nReply line 2\n\nReply line 4"
    };

    console.log('Creating reply with newlines...');
    const replyResponse = await axios.post(`http://localhost:3001/api/tickets/${createResponse.data.id}/replies`, replyData, {
      withCredentials: true
    });

    console.log('Reply created:', replyResponse.data);
    console.log('Reply body as received:', JSON.stringify(replyResponse.data.body));

    // Fetch replies back
    console.log('Fetching replies...');
    const repliesResponse = await axios.get(`http://localhost:3001/api/tickets/${createResponse.data.id}/replies`, {
      withCredentials: true
    });

    console.log('Replies fetched:', repliesResponse.data);
    if (repliesResponse.data.length > 0) {
      const fetchedReplyBody = repliesResponse.data[0].body;
      console.log('Reply body as fetched:', JSON.stringify(fetchedReplyBody));

      if (replyData.body === fetchedReplyBody) {
        console.log('✅ Reply newlines preserved correctly!');
      } else {
        console.log('❌ Reply newlines not preserved');
        console.log('Original reply:', JSON.stringify(replyData.body));
        console.log('Fetched reply:', JSON.stringify(fetchedReplyBody));
      }
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testNewlines();