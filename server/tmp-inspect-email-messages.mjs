  import { PrismaClient } from './src/generated/prisma/client.js';
const p = new PrismaClient();
const rows = await p.emailMessage.findMany({
  select: { id: true, messageId: true, inReplyTo: true, references: true, gmailThreadId: true, ticketId: true, replyId: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.log(JSON.stringify(rows, null, 1));
console.log('total:', rows.length);
await p.$disconnect();