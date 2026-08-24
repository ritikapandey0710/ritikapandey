// CONFIRMED duplicate cleanup — deletes ONLY the 7 approved IDs, each in a
// per-ticket $transaction in dependency order: emailMessages -> replies -> ticket.
import 'dotenv/config';
import { prisma } from './src/lib/prisma';

const TO_DELETE = [
  '38de4955-c3c4-43fa-911b-5975836bd437', // TKT-00323
  'ed50a08d-7f64-4328-a7f8-f93c496ba84c', // TKT-00324
  'fd505487-e37c-4cc6-a991-8898c000735d', // TKT-00325
  '192ef76c-1c0b-4de0-a72c-a129835178a7', // TKT-00326
  '7139f948-bd28-452f-93ee-ecaba92baa81', // TKT-00327
  '3a18c4a1-ba60-49e6-ab92-7f579465272f', // TKT-00319
  '09dd74bb-7a83-43bd-a9df-953c91325c36', // TKT-00320
];

const KEEP = ['ce09d00e-d9d2-4538-af9c-a9d21763b5ef', 'cef3d4c1-a259-46c1-bf8c-5a7a277df97e'];

async function main() {
  let deleted = 0;
  for (const id of TO_DELETE) {
    const deletedTicket = await prisma.$transaction(async (tx) => {
      await tx.emailMessage.deleteMany({ where: { ticketId: id } });
      await tx.reply.deleteMany({ where: { ticketId: id } });
      return tx.ticket.delete({ where: { id } });
    });
    deleted++;
    console.log(`DELETED ${deleted}/7: ${id} (${deletedTicket.ticketNumber})`);
  }

  console.log(`\nTOTAL_DELETED=${deleted}`);

  for (const id of [...TO_DELETE, ...KEEP]) {
    const t = await prisma.ticket.findUnique({ where: { id }, select: { ticketNumber: true } });
    console.log(`VERIFY ${id} => ${t ? `EXISTS (TKT-${String(t.ticketNumber).padStart(5, '0')})` : 'NOT FOUND'}`);
  }

  console.log(`\nFINAL_TOTAL_TICKETS=${await prisma.ticket.count()}`);
}

main()
  .catch((e) => { console.error('CLEANUP FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
