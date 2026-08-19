const API_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const TICKET_ID = '6e873670-9c33-4ce5-ae10-95c850bf03c8';

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
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return setCookies.map(c => c.split(';')[0]).join('; ');
}

async function generateSummary(cookies) {
  const res = await fetch(`${API_URL}/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookies },
    body: JSON.stringify({ ticketId: TICKET_ID }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

console.log('Signing in as admin...');
const cookies = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
if (!cookies) {
  console.error('Sign-in failed');
  process.exit(1);
}
console.log('Signed in OK');

async function retrySummary(cookies, maxAttempts = 12) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\nAttempt ${attempt}/${maxAttempts}: generating summary...`);
    const result = await generateSummary(cookies);
    console.log(`  Status: ${result.status}`);

    if (result.status === 200) {
      return result;
    }

    if (attempt >= maxAttempts) break;

    // Parse retry time from error if present (format: "Please retry in Xs")
    let waitSeconds = 60;
    const err = result.body?.error || '';
    const retryMatch = err.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (retryMatch) {
      waitSeconds = Math.max(parseFloat(retryMatch[1]) + 5, 10);
    }
    console.log(`  Rate limited. Waiting ${Math.floor(waitSeconds)}s before retry...`);
    await new Promise(r => setTimeout(r, waitSeconds * 1000));
  }
  return { status: -1, body: { error: 'Max retry attempts reached' } };
}

console.log('Doing initial short wait...');
await new Promise(r => setTimeout(r, 5000));

console.log('Starting summary generation with retries...');
const result = await retrySummary(cookies);

if (result.status !== 200) {
  console.log('Summary generation failed:', JSON.stringify(result.body));
  process.exit(1);
}

const summaryText = result.body.summary || result.body.text || '';
console.log('\n=== SUMMARY GENERATED ===');
console.log(`Length: ${summaryText.length} chars`);
console.log('---');
console.log(summaryText);
console.log('---');
console.log('\nSUMMARY_SUCCESS=true');