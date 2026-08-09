require('dotenv').config({ path: './.env' }); // Load from server/.env
console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL);

// Parse the connection string to see what password is being used
const url = new URL(process.env.DATABASE_URL);
console.log('Parsed connection details:');
console.log('  Host:', url.hostname);
console.log('  Port:', url.port || 5432);
console.log('  Database:', url.pathname.substring(1));
console.log('  Username:', url.username);
console.log('  Password:', url.password ? '***SET***' : '(empty)');

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing query', err.stack);
    }
    console.log('Connected successfully! Current time:', result.rows[0]);
    pool.end();
  });
});