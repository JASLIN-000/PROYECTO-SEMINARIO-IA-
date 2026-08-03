const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DEFAULT_FILE = path.resolve(__dirname, '..', 'data', 'hallazgos-carga-semana.json');

function normalizeEstado(raw) {
  const estado = String(raw || 'ABIERTO').trim().toUpperCase();
  if (estado === 'CERRADO') return 'SOLUCIONADO';
  if (estado === 'PROCESO') return 'PENDIENTE';
  if (estado === 'SOLUCIONADO' || estado === 'PENDIENTE' || estado === 'ABIERTO') return estado;
  return 'ABIERTO';
}

function normalizeCotizacion(raw, estado) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return estado === 'ABIERTO' ? 'SI' : 'NA';
  }

  const value = String(raw).trim().toUpperCase().replace('/', '');
  if (value === 'SI' || value === 'NO' || value === 'NA') {
    return value;
  }

  return estado === 'ABIERTO' ? 'SI' : 'NA';
}

function toDateOnly(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return text;
}

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isInsideWeek(dateIso, weekStartIso, weekEndIso) {
  return dateIso >= weekStartIso && dateIso <= weekEndIso;
}

function parseArgs(argv) {
  const args = {
    file: DEFAULT_FILE,
    allowOutsideWeek: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file' && argv[i + 1]) {
      args.file = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }

    if (token === '--allow-outside-week') {
      args.allowOutsideWeek = true;
    }
  }

  return args;
}

function readPayload(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo de carga: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.hallazgos)) {
    return parsed.hallazgos;
  }

  throw new Error('El archivo debe ser un arreglo JSON o un objeto con propiedad hallazgos[].');
}

async function resolveEquipoId(client, item) {
  if (item.equipoId !== undefined && item.equipoId !== null && String(item.equipoId).trim() !== '') {
    const id = Number(item.equipoId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new Error(`equipoId invalido: ${item.equipoId}`);
    }

    const exists = await client.query('SELECT id FROM equipos WHERE id = $1', [id]);
    if (!exists.rowCount) {
      throw new Error(`No existe equipo con id=${id}`);
    }

    return id;
  }

  const rawCode = item.codigoEquipo ?? item.idEquipo ?? item.equipo_codigo;
  if (rawCode === undefined || rawCode === null || String(rawCode).trim() === '') {
    throw new Error('Cada registro debe incluir equipoId o codigoEquipo/idEquipo.');
  }

  const code = String(rawCode).trim().toLowerCase();
  const found = await client.query('SELECT id, id_equipo FROM equipos WHERE LOWER(id_equipo) = $1 LIMIT 1', [code]);
  if (!found.rowCount) {
    throw new Error(`No existe equipo con codigo ${rawCode}`);
  }

  return Number(found.rows[0].id);
}

async function insertHallazgo(client, row) {
  const result = await client.query(
    `
      INSERT INTO hallazgos (
        equipo_id,
        mantenimiento_id,
        tipo_mantenimiento,
        modulo,
        descripcion_hallazgo,
        cotizacion,
        observacion,
        estado,
        fecha_hallazgo,
        fecha_solucion
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `,
    [
      row.equipoId,
      row.mantenimientoId,
      row.tipoMantenimiento,
      row.modulo,
      row.descripcionHallazgo,
      row.cotizacion,
      row.observacion,
      row.estado,
      row.fechaHallazgo,
      row.fechaSolucion,
    ],
  );

  return Number(result.rows[0].id);
}

async function insertEstadoHistorialIfExists(client, hallazgoId, estado) {
  const table = await client.query("SELECT to_regclass('public.hallazgo_estado_historial') AS reg");
  if (!table.rows[0]?.reg) {
    return;
  }

  await client.query(
    `
      INSERT INTO hallazgo_estado_historial (hallazgo_id, estado_anterior, estado_nuevo, motivo)
      VALUES ($1, NULL, $2, 'CARGA_INICIAL')
    `,
    [hallazgoId, estado],
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = readPayload(args.file);

  if (!payload.length) {
    console.log('No hay hallazgos para cargar.');
    return;
  }

  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekStartIso = toIsoDate(weekStart);
  const weekEndIso = toIsoDate(weekEnd);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'raul123',
    database: process.env.DB_NAME || 'mantenimiento',
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const inserted = [];

    for (let i = 0; i < payload.length; i += 1) {
      const item = payload[i] || {};
      const rowNumber = i + 1;

      const equipoId = await resolveEquipoId(client, item);
      const estado = normalizeEstado(item.estado);
      const fechaHallazgo = toDateOnly(item.fechaHallazgo) || toIsoDate(now);

      if (!args.allowOutsideWeek && !isInsideWeek(fechaHallazgo, weekStartIso, weekEndIso)) {
        throw new Error(
          `Fila ${rowNumber}: fechaHallazgo=${fechaHallazgo} fuera de la semana actual (${weekStartIso} a ${weekEndIso}). ` +
          'Usa --allow-outside-week si deseas permitirlo.',
        );
      }

      const modulo = String(item.modulo || '').trim();
      if (!modulo) {
        throw new Error(`Fila ${rowNumber}: modulo es obligatorio.`);
      }

      const descripcionHallazgo = String(item.descripcionHallazgo ?? item.descripcion_hallazgo ?? '').trim();
      if (!descripcionHallazgo) {
        throw new Error(`Fila ${rowNumber}: descripcionHallazgo es obligatorio.`);
      }

      const mantenimientoId =
        item.mantenimientoId !== undefined && item.mantenimientoId !== null && String(item.mantenimientoId).trim() !== ''
          ? Number(item.mantenimientoId)
          : null;

      if (mantenimientoId !== null && (!Number.isFinite(mantenimientoId) || mantenimientoId <= 0)) {
        throw new Error(`Fila ${rowNumber}: mantenimientoId invalido.`);
      }

      let fechaSolucion = toDateOnly(item.fechaSolucion);
      if (estado === 'SOLUCIONADO' && !fechaSolucion) {
        fechaSolucion = fechaHallazgo;
      }

      const row = {
        equipoId,
        mantenimientoId,
        tipoMantenimiento: String(item.tipoMantenimiento || 'PREVENTIVO').trim() || 'PREVENTIVO',
        modulo,
        descripcionHallazgo,
        cotizacion: normalizeCotizacion(item.cotizacion, estado),
        observacion: item.observacion ? String(item.observacion).trim() : null,
        estado,
        fechaHallazgo,
        fechaSolucion,
      };

      const hallazgoId = await insertHallazgo(client, row);
      await insertEstadoHistorialIfExists(client, hallazgoId, estado);

      inserted.push({ id: hallazgoId, equipoId: row.equipoId, modulo: row.modulo, estado: row.estado, fechaHallazgo: row.fechaHallazgo });
    }

    await client.query('COMMIT');

    console.log(JSON.stringify({
      mensaje: 'Carga completada',
      archivo: args.file,
      semana: { inicio: weekStartIso, fin: weekEndIso },
      totalInsertados: inserted.length,
      hallazgos: inserted,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
