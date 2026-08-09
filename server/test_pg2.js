require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

console.log('DATABASE_URL from environment:', process.env.DATABASE_URL);

// Parse the DATABASE_URL to get connection details
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Extract connection parameters from DATABASE_URL
// Format: postgres://username:password@host:port/database?schema=public
const url = new URL(DATABASE_URL);
const config = {
  user: url.username,
  password: url.password,
  host: url.hostname,
  port: parseInt(url.port),
  database: url.pathname.substring(1), // Remove leading '/'
};

console.log('Connection config:', {
  user: config.user,
  host: config.host,
  port: config.port,
  database: config.database
});

async function testConnection() {
  console.log('Testing connection to PostgreSQL...');
  console.log(`Connecting to: ${config.host}:${config.port}/${config.database} as ${config.user}`);

  const pool = new Pool(config);

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully!');

    // Check if we can query
    const result = await client.query('SELECT version();');
    console.log(`PostgreSQL version: ${result.rows[0].version}`);

    // List databases
    const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Available databases:');
    dbResult.rows.forEach(row => {
      console.log(`  - ${row.datname}`);
    });

    client.release();
    await pool.end();
  } catch (error) {
    console.error('Database connection error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

testConnection();