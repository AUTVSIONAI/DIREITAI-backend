const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sqlPath = path.join(__dirname, 'sql', 'create_missing_store_moderation_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL...');
    await client.query(sql);
    console.log('✅ SQL executed successfully');

  } catch (err) {
    console.error('❌ Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

runSql();
