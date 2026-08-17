import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public',
});

const result = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Reply')");
console.log('Reply table exists:', result.rows[0].exists);

if (result.rows[0].exists) {
  const replyCount = await pool.query('SELECT COUNT(*) FROM "Reply"');
  console.log('Reply count:', replyCount.rows[0].count);
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Reply'");
  console.log('Reply columns:', cols.rows.map((r) => r.column_name).join(', '));
} else {
  console.log('Reply table does NOT exist - needs migration');
}

await pool.end();