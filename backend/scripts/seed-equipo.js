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
    const insert = `INSERT INTO equipos (id_equipo, nombre_equipo, acuerdo_nivel_servicio_dh, estado, ruta_numero)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, id_equipo, nombre_equipo`;

    const values = ['TEST-EQ-01', 'Equipo de prueba', 1, 'ACTIVO', 'R-12'];
    const res = await client.query(insert, values);
    console.log('Inserted:', res.rows[0]);
  } catch (err) {
    console.error('Error inserting test equipo:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
