const { Client } = require('pg');
require('dotenv').config();

async function tableExists(client, tableName) {
  const result = await client.query('SELECT to_regclass($1) AS reg', ['public.' + tableName]);
  return Boolean(result.rows[0]?.reg);
}

async function countRows(client, tableName) {
  const result = await client.query('SELECT COUNT(*)::int AS total FROM ' + tableName);
  return result.rows[0]?.total ?? 0;
}

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
    DO $$
    BEGIN
      IF to_regclass('public.informes_semanales') IS NOT NULL THEN
        TRUNCATE TABLE informes_semanales RESTART IDENTITY;
      END IF;

      IF to_regclass('public.hallazgos') IS NOT NULL THEN
        TRUNCATE TABLE hallazgos RESTART IDENTITY CASCADE;
      END IF;

      IF to_regclass('public.hallazgo_estado_historial') IS NOT NULL THEN
        TRUNCATE TABLE hallazgo_estado_historial RESTART IDENTITY;
      END IF;
    END $$;
  `);

  const tables = ['hallazgos', 'informes_semanales', 'hallazgo_estado_historial'];
  const summary = [];

  for (const table of tables) {
    if (await tableExists(client, table)) {
      summary.push({ tabla: table, total: await countRows(client, table) });
    } else {
      summary.push({ tabla: table, total: null, nota: 'no_existe' });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
