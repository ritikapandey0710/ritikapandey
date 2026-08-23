import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL environment variable is not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL })
});

const SEED_MARKER = '--- [SEED:HELPDESK:REPLY-BATCH-10] ---';

async function main() {
  // First, ensure ticket 10 exists
  let ticket = await prisma.ticket.findUnique({
    where: { id: '10' }
  });

  if (!ticket) {
    console.log('Ticket with ID 10 not found. Creating it...');
    // We need a reporter and assignee. Use existing users.
    const users = await prisma.user.findMany();
    const admin = users.find(u => u.role === 'ADMIN');
    const agent = users.find(u => u.role === 'AGENT' && u.email !== 'admin@example.com');

    if (!admin || !agent) {
      throw new Error('Required users (ADMIN and AGENT) not found. Please seed users first.');
    }

    ticket = await prisma.ticket.create({
      data: {
        title: 'Test Ticket for Reply Seed',
        description: 'This ticket is created solely for seeding 10 replies to test the summarize feature.',
        senderName: admin.name ?? 'Admin User',
        senderEmail: admin.email,
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        category: 'GENERAL_QUESTION',
        assigneeId: agent.id,
        reporterId: admin.id,
        // Explicitly set the ID to '10' (string) - assuming the ID field accepts string UUIDs or we are overriding default
        id: '10'
      }
    });
    console.log(`Created ticket 10 with ID: ${ticket.id}`);
  } else {
    console.log(`Ticket 10 already exists: ${ticket.title}`);
  }

  // Check for existing seeded replies (those with our marker in body)
  const existingReplies = await prisma.reply.findMany({
    where: { ticketId: '10' }
  });

  const seededReplies = existingReplies.filter(r => r.body.includes(SEED_MARKER));

  if (seededReplies.length >= 10) {
    console.log(`Ticket 10 already has ${seededReplies.length} seeded replies. Skipping seed to avoid duplicates.`);
    return;
  }

  // We need to create (10 - seededReplies.length) replies, but we want exactly 10 total seeded replies.
  // However, the requirement is to create exactly 10 new replies.
  // If there are existing seeded replies, we should not create duplicates.
  // We'll create replies only for the missing ones to reach exactly 10 seeded replies total.

  const repliesToCreateCount = 10 - seededReplies.length;
  if (repliesToCreateCount <= 0) {
    console.log(`Already have ${seededReplies.length} seeded replies. No new replies needed.`);
    return;
  }

  console.log(`Need to create ${repliesToCreateCount} more replies to reach 10 seeded replies total.`);

  // Get users: one customer and one agent
  const allUsers = await prisma.user.findMany();
  const adminUser = allUsers.find(u => u.role === 'ADMIN');
  const agentUsers = allUsers.filter(u => u.role === 'AGENT');

  // Find a customer (non-ADMIN, non-AGENT if possible, otherwise use an agent)
  const customerUsers = allUsers.filter(u => u.role !== 'ADMIN' && u.role !== 'AGENT');
  let customer;
  if (customerUsers.length > 0) {
    customer = customerUsers[0];
  } else {
    // Use two different agents: one as customer, one as agent
    if (agentUsers.length < 2) {
      throw new Error('Not enough users to simulate customer and agent conversation.');
    }
    customer = agentUsers[0];
  }
  const agent = agentUsers.find(u => u.id !== customer.id) || agentUsers[0];

  console.log(`Using customer: ${customer.email} (${customer.role})`);
  console.log(`Using agent: ${agent.email} (${agent.role})`);

  // Define the 10 replies in order with rich, multi-line content (at least 10 lines each)
  const repliesData = [
    {
      authorId: customer.id,
      body: `Hello, I'm experiencing issues with my account login. I've tried resetting my password but the reset email never arrives.\n\nI've checked my spam folder thoroughly and verified that my email address is correct in your system.\n\nThis has been happening for the past 2 hours and I'm unable to access my account to retrieve important documents.\n\nCan you please help me regain access to my account as soon as possible? This is urgent as I need to access my account for work today.\n\nI would appreciate any guidance you can provide on alternative verification methods if email is not working.\n\nLet me know what information you need from me to verify my identity.\n\nI've been a loyal customer for over a year and have never had issues like this before.\n\nPlease advise on the next steps I should take to resolve this quickly.\n\nThank you for your assistance.\n\n${SEED_MARKER}`
    },
    {
      authorId: agent.id,
      body: `Hi there, I'd be happy to help you with the login issue you're experiencing. Let's troubleshoot this step by step.\n\nFirst, I've checked our email logs and can see that password reset emails are being sent from our system to your email address.\n\nHowever, it looks like there might be a delay with your email provider or possibly some filtering rules that are blocking our emails.\n\nCould you please:\n1. Double-check that you're entering the correct email address associated with your account\n2. Wait a few more minutes and check all folders including spam, junk, promotions, and all other folders\n3. Try using the 'Forgot Password' link again in case there was a temporary glitch\n4. Verify that your email provider isn't blocking emails from our domain\n5. Check if there are any email forwarding rules that might be redirecting these messages\n\nIf you still don't receive the email after trying these steps, please let me know and we can explore alternative verification methods.\n\nWe have several options available for identity verification if email is not working.\n\nPlease let me know how you'd like to proceed.\n\n${SEED_MARKER}`
    },
    {
      authorId: customer.id,
      body: `Thank you for the quick response. I've double-checked my email address - it's definitely correct as I use it for other services without issue.\n\nI've waited over 30 minutes now and checked spam, junk, promotions, social, updates, and forums tabs in my email client. Still no password reset email.\n\nI've tried the 'Forgot Password' link multiple times with the same result. Each time I submit the form, I get a success message saying the email has been sent, but no email is being delivered to my inbox at all.\n\nIs there an alternative way to verify my identity and regain access to my account? I need to access some important documents for a meeting in one hour.\n\nPlease let me know what other options we have available for account recovery.\n\nI'm concerned about the security implications if someone else could intercept these emails.\n\nCan we use phone verification or security questions as an alternative method?\n\nI'm available to provide any information needed to verify my identity quickly.\n\nThank you for your help!\n\n${SEED_MARKER}`
    },
    {
      authorId: agent.id,
      body: `I understand the urgency of your situation, especially with your meeting approaching. Let's try an alternative verification method since the email delivery seems to be failing.\n\nFor security reasons, I'll need to verify your identity through some account-specific questions before I can proceed with any account recovery actions.\n\nPlease provide answers to the following security questions:\n1. What was the exact date you first created your account? Please include month, day, and year.\n2. What is the last 4 digits of the payment method currently on file with your account?\n3. What security question did you set up during account creation and what is your answer to that question?\n4. What was the last transaction amount and date on your account?\n5. Do you have access to any of your old invoices or receipts from our service?\n\nOnce you provide this information, I can verify your identity against our records and help you reset your password through our internal tools.\n\nPlease note that for your security, I'll need to confirm these details match exactly what we have on file in our system.\n\nThis process helps protect your account from unauthorized access while still providing you with a way to regain control.\n\n${SEED_MARKER}`
    },
    {
      authorId: customer.id,
      body: `I created my account on March 15, 2023. I remember this date because it was right after I finished my certification course and needed to set up our company's helpdesk system.\n\nThe last 4 digits of my payment method on file are 4829. I just checked my physical card to confirm this matches what I have on file.\n\nMy security question was: 'What was the name of your first pet?' and the answer is 'Fluffy'. I got Fluffy when I was 8 years old and she was a golden retriever who lived to be 15 years old.\n\nMy last transaction was for $49.99 on August 10, 2026 for the monthly subscription renewal.\n\nI do have access to my old invoices - I keep them all in a folder labeled 'HelpDesk Payments' in my cloud storage for accounting purposes.\n\nPlease let me know if this information is correct so we can proceed with restoring access to my account.\n\nI'm ready to provide any additional verification information you might need.\n\nPlease let me know the next steps in the password reset process.\n\nThank you for your help!\n\n${SEED_MARKER}`
    },
    {
      authorId: agent.id,
      body: `Thank you for providing that information. I've verified your identity successfully! The details you provided match exactly what we have on file:\n\n- Account creation date: March 15, 2023 ✓\n- Last 4 digits of payment method: 4829 ✓\n- Security question: 'What was the name of your first pet?' Answer: 'Fluffy' ✓\n- Last transaction: $49.99 on August 10, 2026 ✓\n- Invoice history: Available and matches your account ✓\n\nNow I can help you reset your password. I've initiated a password reset through our internal system and generated a temporary password for your account.\n\nYour temporary password is: TempSecure2024!HelpDesk\n\nPlease log in with your email address and this temporary password. Once you're logged in, you will be immediately prompted to create a new permanent password for security reasons.\n\nMake sure to choose a strong password that includes:\n- At least 12 characters\n- A mix of uppercase and lowercase letters\n- Numbers and special symbols\n- Avoid using personal information like birthdays or names\n\nIf you encounter any issues logging in with the temporary password, please let me know immediately so I can assist you further.\n\nFor your security, this temporary password will expire in 24 hours if not used.\n\n${SEED_MARKER}`
    },
    {
      authorId: customer.id,
      body: `I've successfully logged in using the temporary password you provided. The system immediately prompted me to create a new password, which I've done following your security guidelines.\n\nI chose a strong password that meets all the requirements: 14 characters with uppercase, lowercase, numbers, and special symbols.\n\nI can now access my account and I've confirmed that all my documents, files, and settings are intact and exactly as I left them.\n\nThank you so much for your help in resolving this issue! Your prompt and professional support has been greatly appreciated.\n\nIs there anything I should do to prevent this from happening in the future? Should I consider changing any email settings or account preferences?\n\nI want to make sure I don't run into this same issue again next time I need to reset my password or need assistance with my account.\n\nPlease let me know if you recommend any specific settings changes or best practices for account security.\n\nI appreciate your thorough approach to both solving the immediate problem and preventing future occurrences.\n\nAs a final check, I've also reviewed my recent account activity and everything looks normal.\n\n${SEED_MARKER}`
    },
    {
      authorId: agent.id,
      body: `You're very welcome! I'm glad to hear you were able to regain access to your account successfully and that all your data is intact.\n\nTo help prevent similar issues in the future, I recommend:\n1. Adding our email domain (no-reply@helpdesk.example.com) to your email contacts, address book, or safe sender list to prevent filtering by your email provider\n2. Checking if your email provider has any filtering, firewall, or security settings that might be blocking automated emails from our system and adjusting them if necessary\n3. Keeping your account recovery information up to date in your profile settings, including your backup email address and phone number\n4. Consider setting up two-factor authentication for added security, which can provide alternative login methods if email fails\n5. Regularly reviewing your account activity and settings to ensure everything is configured correctly\n\nIf you continue to experience issues with email delivery from our system, please don't hesitate to reach out again. We're here to help 24/7 with any questions or concerns you might have.\\n\nDocumentation is available in our knowledge base about email delivery best practices and troubleshooting steps.\n\nWe value your business and are committed to providing you with excellent support whenever you need it.\n\nPlease let me know if there's anything else I can help you with today.\n\n${SEED_MARKER}`
    },
    {
      authorId: customer.id,
      body: `Thank you for the helpful and detailed suggestions. I've taken the following steps to prevent future issues:\n1. I've added your email domain (no-reply@helpdesk.example.com) to both my email contacts list and my safe sender list in my email client to ensure future emails get through\n2. I've checked my email provider's security settings and found that there were some aggressive filtering rules that I've now adjusted to allow emails from your domain while maintaining security\n3. I've updated my account recovery information with a current backup email address (backup@mycompany.com) and verified my phone number on file is correct\n4. I've also enabled two-factor authentication on my account for added security as you suggested, using an authenticator app for the codes\n5. I've reviewed my account activity and settings to ensure everything is configured correctly and there are no irregularities\n\nEverything is working perfectly now. I really appreciate your prompt, professional, and thorough support throughout this entire process from start to finish.\n\nYou've turned what could have been a frustrating experience into a positive customer service interaction that demonstrates your commitment to customer care.\n\nI will definitely recommend your service to others based on this experience.\n\nHave a wonderful day!\n\n${SEED_MARKER}`
    },
    {
      authorId: agent.id,
      body: `You're most welcome! Thank you for taking the time to implement all the preventive measures I suggested. It's great to see customers being proactive about their account security and following through on recommendations.\n\nI'm pleased to hear that you've successfully added our email domain to your safe sender list, adjusted your email provider's filtering rules, updated your recovery information, and enabled two-factor authentication.\n\nThese steps will significantly reduce the likelihood of experiencing similar email delivery issues in the future and provide multiple ways to access your account if needed.\n\nYour commitment to account security helps protect not only your data but also contributes to the overall security of our service for all users.\n\nIf you need any further assistance, whether it's about this issue or any other questions you might have, please don't hesitate to open a new ticket or reach out through our support channels.\n\nWe value your business and are committed to providing you with excellent support whenever you need it, whether it's a quick question or a complex technical issue.\n\nRemember that our helpdesk is available 24/7 for urgent matters and during regular business hours for general inquiries and support.\n\nHave a wonderful day as well, and thank you for choosing our service and for being such a valued customer.\n\nPlease don't hesitate to reach out if you need anything else.\n\n${SEED_MARKER}`
    }
  ];

  // Create exactly the number of replies needed to reach 10 seeded replies total
  const repliesToCreate = repliesData.slice(0, repliesToCreateCount);

  if (repliesToCreate.length > 0) {
    console.log(`Creating ${repliesToCreate.length} new seeded replies for ticket 10...`);
    const baseTime = new Date();
    // Create replies with timestamps staggered by 2 minutes each
    const createdReplies = await prisma.reply.createManyAndReturn({
      data: repliesToCreate.map((replyData, index) => ({
        ...replyData,
        ticketId: '10',
        createdAt: new Date(baseTime.getTime() + index * 2 * 60 * 1000), // 2 minutes apart
        updatedAt: new Date(baseTime.getTime() + index * 2 * 60 * 1000)
      }))
    });
    console.log(`Successfully created ${createdReplies.count} replies.`);
  } else {
    console.log('All 10 seeded replies already exist. No new replies created.');
  }

  // Final verification
  const totalReplies = await prisma.reply.count({ where: { ticketId: '10' } });
  const finalSeededReplies = await prisma.reply.findMany({
    where: { ticketId: '10' }
  });
  const seededCount = finalSeededReplies.filter(r => r.body.includes(SEED_MARKER)).length;
  console.log(`\\nFinal state for ticket 10:`);
  console.log(`- Total replies: ${totalReplies}`);
  console.log(`- Seeded replies (with marker): ${seededCount}`);

  if (seededCount === 10) {
    console.log('✅ Successfully have exactly 10 seeded replies with marker.');
  } else if (seededCount > 10) {
    console.log(`⚠️ Have ${seededCount} seeded replies (more than 10 due to existing non-seeded replies).`);
  } else {
    console.log(`⚠️ Expected 10 seeded replies, found ${seededCount}.`);
  }
}

main()
  .catch(e => {
    console.error('Error seeding replies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });