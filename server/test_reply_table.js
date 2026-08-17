const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public',
});

async function main() {
  try {
    const [tickets, replies] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM "Ticket"'),
      pool.query('SELECT COUNT(*) FROM "Reply"'),
    ]);
    console.log('Tickets:', tickets.rows[0].count);
    console.log('Replies:', replies.rows[0].count);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();