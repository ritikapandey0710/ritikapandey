const API_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const CUSTOMER_EMAIL = 'customer@example.com';
const CUSTOMER_PASSWORD = 'Customer123!';

const TICKET_ID = '6e873670-9c33-4ce5-ae10-95c850bf03c8';

let adminCookies = '';
let customerCookies = '';

async function signIn(email, password) {
  const res = await fetch(`${API_URL}/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173',
      Referer: 'http://localhost:5173/login',
    },
    body: JSON.stringify({ email, password }),
  });
  console.log(`signIn(${email}) -> Status ${res.status}`);
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
  if (!cookieStr) {
    // fallback: try to find any set-cookie in raw headers
    const raw = res.headers.raw ? res.headers.raw() : null;
    if (raw && raw['set-cookie']) {
      return raw['set-cookie'].map(c => c.split(';')[0]).join('; ');
    }
  }
  return cookieStr;
}

async function apiGet(path, cookies) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookies },
  });
  return { status: res.status, body: await res.json() };
}

async function apiPost(path, cookies, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function apiPatch(path, cookies, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

console.log('=== STEP 1: Sign in as admin ===');
adminCookies = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
console.log('Admin cookies:', adminCookies ? 'captured (' + adminCookies.length + ' chars)' : 'EMPTY');

if (!adminCookies) {
  console.log('FATAL: Could not capture admin cookies');
  process.exit(1);
}

console.log('\n=== STEP 2: Fetch ticket ===');
const ticketRes = await apiGet(`/tickets/${TICKET_ID}`, adminCookies);
console.log('Status:', ticketRes.status);
if (ticketRes.status !== 200) {
  console.log('Ticket fetch failed:', JSON.stringify(ticketRes.body));
  process.exit(1);
}
const ticket = ticketRes.body;
console.log(`  Title: ${ticket.title}`);
console.log(`  Status: ${ticket.status}`);
console.log(`  Category: ${ticket.category}`);
console.log(`  Priority: ${ticket.priority}`);
console.log(`  Sender: ${ticket.senderName} (${ticket.senderEmail})`);

console.log('\n=== STEP 3: Fetch replies ===');
const repliesRes = await apiGet(`/tickets/${TICKET_ID}/replies`, adminCookies);
console.log('Status:', repliesRes.status);
const replies = repliesRes.body;
console.log(`  Replies found: ${replies.length}`);
for (const r of replies) {
  console.log(`  [${r.senderType}] ${r.author?.name} (${r.author?.email}): ${r.body.substring(0, 80)}...`);
}

// Verify agent (KB resolution) reply exists
const agentReply = replies.find(r => r.senderType === 'AGENT');
console.log(`\n  Agent reply (KB resolution) present: ${agentReply ? 'YES' : 'NO'}`);
if (agentReply) {
  console.log(`  Agent reply body preview: ${agentReply.body.substring(0, 120)}...`);
  console.log(`  Agent reply author: ${agentReply.author?.name} (${agentReply.author?.email})`);
}

console.log('\n=== STEP 4: Sign in as customer ===');
customerCookies = await signIn(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
console.log('Customer cookies:', customerCookies ? 'captured' : 'EMPTY');

console.log('\n=== STEP 5: Add customer confirmation reply ===');
const customerMessage =
  'I followed the troubleshooting steps you provided. I checked the page load times and ' +
  'I can confirm the website is responding much faster now after you optimized the caching. ' +
  'The slow response and lag issues have been resolved - pages are loading quickly again. ' +
  'My performance issue is fully resolved. Thank you for your help!';

const postRes = await apiPost(`/tickets/${TICKET_ID}/replies`, customerCookies, {
  body: customerMessage,
});
console.log('Post reply status:', postRes.status);
const customerReply = postRes.body;
if (postRes.status !== 201) {
  console.log('Customer reply failed:', JSON.stringify(customerReply));
} else {
  console.log(`  Reply ID: ${customerReply.id}`);
  console.log(`  senderType: ${customerReply.senderType}`);
  console.log(`  authorId: ${customerReply.authorId}`);
}

console.log('\n=== STEP 6: Re-fetch replies (verify conversation) ===');
const repliesRes2 = await apiGet(`/tickets/${TICKET_ID}/replies`, adminCookies);
const replies2 = repliesRes2.body;
console.log(`  Total replies now: ${replies2.length}`);
for (const r of replies2) {
  console.log(`  [${r.senderType}] ${r.author?.name}: ${r.body.substring(0, 80)}...`);
}

const hasAgent = replies2.some(r => r.senderType === 'AGENT');
const hasCustomer = replies2.some(r => r.senderType === 'CUSTOMER');
console.log(`\n  Agent reply present: ${hasAgent}`);
console.log(`  Customer reply present: ${hasCustomer}`);

console.log('\n=== STEP 7: Ensure ticket stays RESOLVED ===');
const ticketRes2 = await apiGet(`/tickets/${TICKET_ID}`, adminCookies);
const ticket2 = ticketRes2.body;
console.log(`  Ticket status now: ${ticket2.status}`);

// Explicitly ensure RESOLVED (webhook already set it, but reinforce as in e2e)
const patchRes = await apiPatch(`/tickets/${TICKET_ID}`, adminCookies, { status: 'RESOLVED' });
console.log(`  PATCH status -> ${patchRes.status}`);
const patchedTicket = patchRes.body;
console.log(`  Confirmed status: ${patchedTicket.status}`);

console.log('\n=== STEP 8: Generate AI summary ===');
const summaryRes = await apiPost(`/ai/summarize`, adminCookies, { ticketId: TICKET_ID });
console.log('  Summary API status:', summaryRes.status);
const summaryData = summaryRes.body;
if (summaryRes.status === 200) {
  const summaryText = summaryData.summary || summaryData.text || '';
  console.log(`  Summary generated (${summaryText.length} chars):`);
  console.log('  ---');
  console.log(summaryText);
  console.log('  ---');
} else {
  console.log('  Summary API error:', JSON.stringify(summaryData));
}

console.log('\n=== VERIFICATION COMPLETE ===');