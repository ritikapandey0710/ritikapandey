import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Override the database URL to ensure we use the correct database
process.env.DATABASE_URL = 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

async function main() {
  console.log('Seeding 100 tickets...');

  // Get all users to assign as reporters and assignees
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.error('No users found. Please run user seed first.');
    process.exit(1);
  }

  const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const categories = ['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'];

  const subjects = [
    "Password reset request",
    "Billing inquiry",
    "Cannot access account",
    "Feature request: dark mode",
    "Error 500 when submitting form",
    "Refund request for order #1234",
    "Question about API usage",
    "Unable to reset password",
    "Login page not loading",
    "Integration issue with third-party service",
    "Email not sending",
    "Slow website performance",
    "Data export failed",
    "Security concern: suspicious login",
    "Update payment method",
    "Cancel subscription",
    "Missing invoice",
    "Application crash on startup",
    "Compatibility issue with latest browser",
    "Request for documentation",
    "Need training on new feature",
    "Service outage reported",
    "API rate limit exceeded",
    "Widget not displaying correctly",
    "Need assistance with setup",
    "Want to upgrade plan",
    "Report a bug in mobile app",
    "Request for refund due to dissatisfaction",
    "Query about data retention policy",
  ];

  const tickets = [];
  for (let i = 1; i <= 100; i++) {
    const randomReporter = users[Math.floor(Math.random() * users.length)];
    const randomAssignee = Math.random() > 0.3 ? users[Math.floor(Math.random() * users.length)] : null; // 30% chance of no assignee
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Create a date within the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);
    createdAt.setMinutes(createdAt.getMinutes() - minutesAgo);

    tickets.push({
      title: subjects[Math.floor(Math.random() * subjects.length)],
      description: `A customer reports that ${subjects[Math.floor(Math.random() * subjects.length)].toLowerCase()}. Please investigate and resolve promptly.`,
      senderName: randomReporter.name ?? `User ${randomReporter.id}`,
      senderEmail: randomReporter.email ?? 'no-reply@example.com',
      status: randomStatus,
      priority: randomPriority,
      category: randomCategory,
      assigneeId: randomAssignee?.id ?? null,
      reporterId: randomReporter.id,
      createdAt: createdAt,
      updatedAt: createdAt // Initially same as createdAt
    });
  }

  // Insert tickets in batches of 20 to avoid potential issues
  const batchSize = 20;
  for (let i = 0; i < tickets.length; i += batchSize) {
    const batch = tickets.slice(i, i + batchSize);
    await prisma.ticket.createMany({
      data: batch,
      skipDuplicates: true, // Ignore duplicates if any
    });
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tickets.length / batchSize);
    console.log(`Inserted batch ${batchNumber}/${totalBatches}`);
  }

  console.log('Successfully seeded 100 tickets!');
}

main()
  .catch((e) => {
    console.error('Error seeding tickets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });