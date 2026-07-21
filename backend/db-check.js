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

  const tables = ['equipos', 'plantillas', 'hallazgos', 'tecnicos_acceso', 'modulos', 'mantenimientos', 'hallazgo_estado_historial'];
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`Table "${table}": ${res.rows[0].count} rows`);
    } catch (err) {
      console.log(`Table "${table}": Error -> ${err.message}`);
    }
  }

  await client.end();
}

main().catch(console.error);
