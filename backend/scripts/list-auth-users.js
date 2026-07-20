const path = require('node:path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function coerceCedula10(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,10}$/.test(raw)) {
    return null;
  }
  return raw.padStart(10, '0');
}

function buildPassword(cedula) {
  const normalized = coerceCedula10(cedula);
  if (!normalized) {
    return null;
  }
  return `trazaDH${normalized.slice(-4)}`;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mantenimiento',
  });

  await client.connect();

  const sql = `
    SELECT
      id,
      usuario,
      nombre,
      cedula,
      ruta_numero AS "rutaNumero",
      activo
    FROM tecnicos_acceso
    ORDER BY id ASC
  `;

  const result = await client.query(sql);

  if (!result.rows.length) {
    console.log('No hay tecnicos registrados en tecnicos_acceso.');
    await client.end();
    return;
  }

  const rows = result.rows.map((item) => {
    const cedulaNormalizada = coerceCedula10(item.cedula);
    const passwordEsperada = buildPassword(item.cedula);

    return {
      id: item.id,
      usuario: item.usuario,
      nombre: item.nombre,
      cedula: cedulaNormalizada || String(item.cedula || ''),
      ruta: item.rutaNumero,
      activo: item.activo,
      passwordEsperada: passwordEsperada || 'CEDULA_INVALIDA',
    };
  });

  console.table(rows);

  await client.end();
}

main().catch((error) => {
  console.error('Error listando usuarios de acceso:', error.message);
  process.exitCode = 1;
});
