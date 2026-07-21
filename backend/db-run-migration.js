const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'raul123',
    database: process.env.DB_NAME || 'mantenimiento',
  });

  await client.connect();

  const sqlPath = path.join(__dirname, 'sql', '02_spec4_hardening.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running 02_spec4_hardening.sql...');
  try {
    await client.query(sql);
    console.log('02_spec4_hardening.sql ran successfully!');
  } catch (err) {
    console.error('Error running SQL:', err.message);
  }

  await client.end();
}

main().catch(console.error);
