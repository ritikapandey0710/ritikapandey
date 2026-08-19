import "dotenv/config";
import { prisma } from './src/lib/prisma';
import { auth } from './src/lib/auth';

/**
 * Setup script for the webhook ticket resolution e2e test.
 *
 * Creates two users that do NOT exist in the default seed:
 * 1. A "system" / bot user  (email: system@helpdesk.local, role: USER)
 *    – used as the author of auto-resolution replies created by the webhook
 *      when no reporter is authenticated (reporterId is null).
 *
 * 2. A "customer" user       (email: customer@example.com, role: USER)
 *    – a USER-role user that can post CUSTOMER replies through the
 *      existing reply API (senderType is CUSTOMER for non-ADMIN/AGENT roles).
 *
 * Both users must have role USER so that the reply controller assigns
 * senderType = "CUSTOMER" to their replies. The database's Role enum
 * may be missing the USER value (the initial migration only had ADMIN/AGENT),
 * so we add it first via raw SQL.
 */
async function main() {
  // ── 0. Ensure the "USER" value exists in the database Role enum ──────
  // The initial migration created the enum as ('ADMIN', 'AGENT').
  // The Prisma schema now includes USER, but the DB may lag behind.
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE 'USER'`);
    console.log('Added USER to Role enum');
  } catch (e: any) {
    // Value may already exist — that's fine
    if (e?.message?.includes('already') || e?.message?.includes('exist')) {
      console.log('USER already in Role enum');
    } else {
      console.error('Could not add USER to Role enum:', e?.message);
    }
  }

  // ── 1. System / bot user (role USER) ────────────────────────────────
  const botEmail = 'system@helpdesk.local';
  const botPassword = 'SystemBot123!';
  let botUser = await prisma.user.findUnique({ where: { email: botEmail } });

  if (!botUser) {
    const result = await auth.api.signUpEmail({
      body: { email: botEmail, password: botPassword, name: 'Support Bot' },
    });
    if (!result || !result.user) {
      throw new Error('Failed to create system bot user via better-auth');
    }
    botUser = await prisma.user.update({
      where: { id: result.user.id },
      data: { role: 'USER', emailVerified: true },
    });
    console.log(`Created system bot user: id=${botUser.id} email=${botUser.email}`);
  } else {
    console.log(`System bot user already exists: id=${botUser.id}`);
  }

  // ── 2. Customer user (role USER) ────────────────────────────────────
  const customerEmail = 'customer@example.com';
  const customerPassword = 'Customer123!';
  let customerUser = await prisma.user.findUnique({ where: { email: customerEmail } });

  if (!customerUser) {
    const result = await auth.api.signUpEmail({
      body: { email: customerEmail, password: customerPassword, name: 'Test Customer' },
    });
    if (!result || !result.user) {
      throw new Error('Failed to create customer user via better-auth');
    }
    customerUser = await prisma.user.update({
      where: { id: result.user.id },
      data: { role: 'USER', emailVerified: true },
    });
    console.log(`Created customer user: id=${customerUser.id} email=${customerUser.email}`);
  } else {
    console.log(`Customer user already exists: id=${customerUser.id}`);
  }

  // ── 3. Summary ──────────────────────────────────────────────────────
  console.log('\n=== Setup complete ===');
  console.log(`Bot user ID:          ${botUser.id}`);
  console.log(`Customer user ID:     ${customerUser.id}`);
  console.log(`Customer email:       ${customerEmail}`);
  console.log(`Customer password:    ${customerPassword}`);
}

main()
  .catch((e) => {
    console.error('Setup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
