import { prisma } from './src/lib/prisma';
import { classifyTicket } from './src/controllers/ai.controller';

const TAG = `AIERR_${Date.now()}`;

type Cat = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST' | null;

interface TicketFields {
  title: string;
  description: string | null;
  category: Cat;
  priority: string;
  senderName: string;
  senderEmail: string;
}

async function createTicket(fields: TicketFields, status: string) {
  return prisma.ticket.create({
    data: {
      title: fields.title,
      description: fields.description,
      status: status as any,
      priority: fields.priority as any,
      category: fields.category as any,
      senderName: fields.senderName,
      senderEmail: fields.senderEmail,
    },
  });
}

/**
 * Reproduce the classifyTicket promise chain EXACTLY as currently written in
 * server/src/controllers/ticket.controller.ts and server/src/routes/webhooks.ts.
 * The only behaviour under test is the .catch() handler (the change we made):
 * on AI failure, set status -> "OPEN" and log the original error, leaving all
 * other fields untouched.
 */
async function runChain(ticketId: string, classifyFn: (t: string, d: string | null) => Promise<{ category: string; priority: string }>) {
  return classifyFn('Test Title', 'Test Description')
    .then(({ category, priority }) => {
      return prisma.ticket.update({
        where: { id: ticketId },
        data: { category: category as any, priority: priority as any },
      });
    })
    .then(() => {
      // success path: nothing else to do here
    })
    .catch((error) => {
      // Log the original AI text-generation error for debugging
      console.error(`AI classification failed for ticket ${ticketId}`, error);
      return prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "OPEN" },
      }).catch((statusUpdateError) => {
        console.error(`Failed to reset ticket ${ticketId} status to OPEN after AI classification failure:`, statusUpdateError);
      });
    });
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log('PASS:', msg);
  else { console.error('FAIL:', msg); failures++; }
}

async function main() {
  // =========================================================================
  // FAILURE CASE: classifyTicket (the AI text-generation step) throws.
  // Clear the API key so classifyTicket throws immediately ("GEMINI_API_KEY
  // is not set") -> this simulates generateText throwing.
  // =========================================================================
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';

  const failFields: TicketFields = {
    title: `FAIL_${TAG}`,
    description: 'fail description',
    category: null,
    priority: 'MEDIUM',
    senderName: 'FailUser',
    senderEmail: 'fail@example.com',
  };
  const failTicket = await createTicket(failFields, 'PROCESSING');

  await runChain(failTicket.id, classifyTicket);
  await new Promise((r) => setTimeout(r, 200));

  const failAfter = await prisma.ticket.findUnique({ where: { id: failTicket.id } });
  assert(failAfter!.status === 'OPEN', 'FAIL CASE: ticket status should be OPEN after AI generation throws');
  assert(failAfter!.title === failFields.title, 'FAIL CASE: title unchanged');
  assert(failAfter!.description === failFields.description, 'FAIL CASE: description unchanged');
  assert(failAfter!.category === failFields.category, 'FAIL CASE: category unchanged (still null)');
  assert(failAfter!.priority === 'MEDIUM', 'FAIL CASE: priority unchanged');
  assert(failAfter!.senderName === failFields.senderName, 'FAIL CASE: senderName unchanged');
  assert(failAfter!.senderEmail === failFields.senderEmail, 'FAIL CASE: senderEmail unchanged');

  process.env.GEMINI_API_KEY = savedKey;

  // =========================================================================
  // SUCCESS CASE: AI generation succeeds (mock) -> existing .then() behavior
  // is preserved: category+priority updated; .catch() must NOT run, so status
  // is untouched.
  // =========================================================================
  const successFields: TicketFields = {
    title: `SUCCESS_${TAG}`,
    description: 'success description',
    category: null,
    priority: 'LOW',
    senderName: 'SuccessUser',
    senderEmail: 'success@example.com',
  };
  const successTicket = await createTicket(successFields, 'PROCESSING');

  const mockClassify = async () => ({ category: 'TECHNICAL_QUESTION', priority: 'HIGH' });
  await runChain(successTicket.id, mockClassify);
  await new Promise((r) => setTimeout(r, 200));

  const successAfter = await prisma.ticket.findUnique({ where: { id: successTicket.id } });
  assert(successAfter!.status === 'PROCESSING', 'SUCCESS CASE: status untouched (existing behavior unchanged - .catch did not run)');
  assert(successAfter!.category === 'TECHNICAL_QUESTION', 'SUCCESS CASE: category updated by classification (.then ran)');
  assert(successAfter!.priority === 'HIGH', 'SUCCESS CASE: priority updated by classification (.then ran)');
  assert(successAfter!.title === successFields.title, 'SUCCESS CASE: title unchanged');
  assert(successAfter!.senderName === successFields.senderName, 'SUCCESS CASE: senderName unchanged');

  // cleanup
  await prisma.ticket.deleteMany({ where: { id: { in: [failTicket.id, successTicket.id] } } });
  await prisma.$disconnect();

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
