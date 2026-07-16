const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'raul123',
  database: process.env.DB_NAME || 'mantenimiento',
});

async function main() {
  try {
    await client.connect();
    const update = `UPDATE equipos SET acuerdo_nivel_servicio_dh = $1 WHERE id_equipo = $2 RETURNING id, id_equipo, acuerdo_nivel_servicio_dh`;
    const values = [10, 'TEST-EQ-01'];
    const res = await client.query(update, values);
    console.log('Updated:', res.rows[0]);
  } catch (err) {
    console.error('Error updating test equipo:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
