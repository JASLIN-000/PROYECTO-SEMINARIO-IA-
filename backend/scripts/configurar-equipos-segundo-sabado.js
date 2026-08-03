const { Client } = require('pg');
require('dotenv').config();

const EQUIPOS_SEGUNDO_SABADO = ['4696S-01', '4696S-02', '4696S-03'];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'raul123',
    database: process.env.DB_NAME || 'mantenimiento',
  });

  await client.connect();

  await client.query(`
    ALTER TABLE equipos
    ADD COLUMN IF NOT EXISTS programacion_sabado_semana SMALLINT;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_equipos_programacion_sabado
    ON equipos(programacion_sabado_semana);
  `);

  const normalizedCodes = EQUIPOS_SEGUNDO_SABADO.map((item) => item.trim().toLowerCase());

  const updated = await client.query(
    `
      UPDATE equipos
      SET programacion_sabado_semana = 2
      WHERE LOWER(id_equipo) = ANY($1::text[])
      RETURNING id, id_equipo, nombre_equipo, programacion_sabado_semana
    `,
    [normalizedCodes],
  );

  const existing = await client.query(
    `
      SELECT id, id_equipo, nombre_equipo, programacion_sabado_semana
      FROM equipos
      WHERE LOWER(id_equipo) = ANY($1::text[])
      ORDER BY id_equipo ASC
    `,
    [normalizedCodes],
  );

  await client.end();

  console.log(
    JSON.stringify(
      {
        objetivo: EQUIPOS_SEGUNDO_SABADO,
        actualizados: updated.rowCount,
        equipos: existing.rows,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
