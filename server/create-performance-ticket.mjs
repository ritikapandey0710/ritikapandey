import crypto from 'crypto';
import 'dotenv/config';

const API_URL = 'http://localhost:3001/api/webhooks/tickets';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

const payload = {
  title: 'Performance Issues (Slow Website)',
  description:
    'The website is loading very slowly. Pages take unusually long to load and I experience page load time delays. ' +
    'The slow response and page load time have been happening for days, causing lag and timeouts. ' +
    'I have a performance issue where the slow website performance is affecting my work.',
  senderName: 'Test Customer',
  senderEmail: 'customer@example.com',
  priority: 'MEDIUM',
  category: 'TECHNICAL_QUESTION',
};

const webhookBody = JSON.stringify(payload);
const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(webhookBody).digest('hex');

const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-webhook-signature': signature },
  body: webhookBody,
});

const body = await response.json();
console.log('HTTP Status:', response.status);
console.log('Response:', JSON.stringify(body, null, 2));

if (body.id) {
  console.log('\nTICKET_CREATED=true');
  console.log(`TICKET_ID=${body.id}`);
  console.log(`STATUS=${body.status}`);
  console.log(`TITLE=${body.title}`);
} else {
  console.log('TICKET_CREATED=false');
}