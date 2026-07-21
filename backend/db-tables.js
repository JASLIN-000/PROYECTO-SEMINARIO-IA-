const { Client } = require('pg');
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

  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log('Tables in public schema:');
  console.log(res.rows.map(r => r.table_name));

  await client.end();
}

main().catch(console.error);
