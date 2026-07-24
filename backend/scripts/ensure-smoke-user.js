const path = require('node:path');
const { createHash } = require('node:crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function hashPassword(password) {
  const salt = process.env.AUTH_PASSWORD_SALT || 'mantenimiento-mvp';
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function coerceCedula10(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,10}$/.test(raw)) {
    return null;
  }

  return raw.padStart(10, '0');
}

async function main() {
  const cedula = coerceCedula10(process.env.AUTH_DEFAULT_CEDULA || '1010101010');
  if (!cedula) {
    throw new Error('AUTH_DEFAULT_CEDULA invalida. Debe contener solo digitos.');
  }

  const usuario = String(process.env.AUTH_DEFAULT_USUARIO || 'tecnico.demo@trazadh.com').trim().toLowerCase();
  const nombre = String(process.env.AUTH_DEFAULT_NOMBRE || 'Tecnico Demo').trim();
  const rutaNumero = String(process.env.AUTH_DEFAULT_RUTA || 'R1').trim();
  const password = String(process.env.AUTH_DEFAULT_PASSWORD || `trazaDH${cedula.slice(-4)}`);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'mantenimiento',
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS tecnicos_acceso (
      id BIGSERIAL PRIMARY KEY,
      usuario VARCHAR(120),
      cedula VARCHAR(30) NOT NULL UNIQUE,
      nombre VARCHAR(120) NOT NULL,
      ruta_numero VARCHAR(20) NOT NULL,
      password_hash VARCHAR(64) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await client.query(`
    INSERT INTO tecnicos_acceso (usuario, cedula, nombre, ruta_numero, password_hash, activo)
    VALUES ($1, $2, $3, $4, $5, TRUE)
    ON CONFLICT (cedula)
    DO UPDATE
      SET usuario = EXCLUDED.usuario,
          nombre = EXCLUDED.nombre,
          ruta_numero = EXCLUDED.ruta_numero,
          password_hash = EXCLUDED.password_hash,
          activo = TRUE,
          updated_at = NOW();
  `, [usuario, cedula, nombre, rutaNumero, hashPassword(password)]);

  await client.end();

  process.stdout.write(JSON.stringify({ usuario, password, rutaNumero }));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});