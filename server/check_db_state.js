import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public',
});

const ticketCols = await pool.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Ticket' ORDER BY ordinal_position"
);
console.log('=== Ticket columns ===');
console.log(ticketCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join('\n'));

const replyExists = await pool.query(
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Reply')"
);
console.log('\n=== Reply table exists:', replyExists.rows[0].exists);

if (replyExists.rows[0].exists) {
  const replyCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Reply' ORDER BY ordinal_position"
  );
  console.log('=== Reply columns ===');
  console.log(replyCols.rows.map((r) => `${r.column_name} (${r.data_type})`).join('\n'));
}

const enums = await pool.query(
  "SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname"
);
console.log('\n=== Enums ===');
console.log(enums.rows.map((r) => r.typname).join(', '));

const migrations = await pool.query('SELECT migration_name FROM "_prisma_migrations" ORDER BY started_at');
console.log('\n=== Applied migrations ===');
console.log(migrations.rows.map((r) => r.migration_name).join('\n'));

await pool.end();