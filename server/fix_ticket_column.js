const { Client } = require('pg');

const configs = [
  { name: 'help_desk_test (system env: postgres:postgres)', connectionString: 'postgres://postgres:postgres@localhost:5432/help_desk_test' },
  { name: 'help_desk_test (alt: 230023107062)', connectionString: 'postgres://postgres:230023107062@localhost:5432/help_desk_test' },
  { name: 'helpdesk (.env: 230023107062)', connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' },
];

async function checkAndFix(dbName, connectionString) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`[${dbName}] Connected successfully`);

    // Check columns using information_schema (more portable)
    const columns = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Ticket' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    const colNames = columns.rows.map(r => r.column_name);
    console.log(`[${dbName}] Ticket columns: ${colNames.join(', ')}`);

    // Count tickets
    const countResult = await client.query('SELECT COUNT(*) FROM "Ticket"');
    console.log(`[${dbName}] Ticket count: ${countResult.rows[0].count}`);

    // Check if ticketNumber column exists
    if (!colNames.includes('ticketNumber')) {
      console.log(`[${dbName}] ticketNumber column is MISSING - adding it...`);
      await client.query('ALTER TABLE "Ticket" ADD COLUMN "ticketNumber" SERIAL');
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber")');
      console.log(`[${dbName}] ticketNumber column added successfully`);
    } else {
      console.log(`[${dbName}] ticketNumber column already exists - checking values`);
      const tnCheck = await client.query('SELECT ticketNumber FROM "Ticket" LIMIT 3');
      console.log(`[${dbName}] Sample ticketNumbers: ${tnCheck.rows.map(r => r.ticketNumber).join(', ')}`);
    }
  } catch (err) {
    console.error(`[${dbName}] Error: ${err.message}`);
  } finally {
    await client.end();
  }
}

async function main() {
  for (const { name, connectionString } of configs) {
    await checkAndFix(name, connectionString);
    console.log('---');
  }
}

main();
