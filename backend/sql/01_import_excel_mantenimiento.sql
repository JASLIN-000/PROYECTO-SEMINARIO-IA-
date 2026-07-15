-- =============================================================
-- IMPORTACION MVP MANTENIMIENTO (POSTGRESQL + DBEAVER)
-- Estrategia: staging (texto) -> validacion -> tablas finales
-- =============================================================

BEGIN;

-- 0) REINICIO TOTAL DEL MODELO (DESDE CERO)
-- Si ya eliminaste tablas manualmente, estos DROP no fallan.
-- Si aun existen, las elimina para reconstruir todo limpio.
DROP TABLE IF EXISTS informes CASCADE;
DROP TABLE IF EXISTS tecnicos_acceso CASCADE;
DROP TABLE IF EXISTS hallazgos CASCADE;
DROP TABLE IF EXISTS plantillas CASCADE;
DROP TABLE IF EXISTS equipos CASCADE;
DROP TABLE IF EXISTS stg_hallazgos CASCADE;
DROP TABLE IF EXISTS stg_plantillas CASCADE;
DROP TABLE IF EXISTS stg_equipos CASCADE;

-- 1) FUNCIONES UTILITARIAS
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_parse_dh(value_text TEXT)
RETURNS SMALLINT
LANGUAGE plpgsql
AS $$
DECLARE
  parsed SMALLINT;
BEGIN
  IF value_text IS NULL OR btrim(value_text) = '' THEN
    RAISE EXCEPTION 'acuerdo_nivel_servicio vacio';
  END IF;

  -- Acepta formatos como 1DH, 2 DH, 3dh
  IF btrim(value_text) ~* '^[0-9]+\s*DH$' THEN
    parsed := regexp_replace(upper(btrim(value_text)), '\s*DH$', '', 'g')::SMALLINT;
  ELSE
    RAISE EXCEPTION 'Formato de acuerdo_nivel_servicio invalido: % (esperado: nDH)', value_text;
  END IF;

  IF parsed <= 0 THEN
    RAISE EXCEPTION 'acuerdo_nivel_servicio debe ser > 0: %', value_text;
  END IF;

  RETURN parsed;
END;
$$;

CREATE OR REPLACE FUNCTION fn_parse_date_flexible(value_text TEXT)
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v TEXT;
BEGIN
  v := btrim(COALESCE(value_text, ''));

  IF v = '' THEN
    RETURN NULL;
  END IF;

  IF v ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN to_date(v, 'YYYY-MM-DD');
  ELSIF v ~ '^\d{2}/\d{2}/\d{4}$' THEN
    RETURN to_date(v, 'DD/MM/YYYY');
  ELSE
    RAISE EXCEPTION 'Fecha invalida: % (formatos permitidos: YYYY-MM-DD o DD/MM/YYYY)', v;
  END IF;
END;
$$;

-- 2) TABLAS STAGING (IMPORTA AQUI DESDE EXCEL/CSV)
CREATE TABLE stg_equipos (
  id_equipo TEXT,
  nombre_equipo TEXT,
  acuerdo_nivel_servicio TEXT,
  estado TEXT
);

CREATE TABLE stg_hallazgos (
  id_equipo TEXT,
  tipo_mantenimiento TEXT,
  modulo TEXT,
  descripcion_hallazgo TEXT,
  cotizacion TEXT,
  observacion TEXT,
  estado TEXT,
  fecha_hallazgo TEXT,
  fecha_solucion TEXT
);

CREATE TABLE stg_plantillas (
  modulo TEXT,
  observacion_estandar TEXT
);

-- 3) TABLAS FINALES
-- TABLAS FINALES FUNCIONALES DEL MVP: equipos, plantillas, hallazgos, informes.
CREATE TABLE equipos (
  id BIGSERIAL PRIMARY KEY,
  id_equipo VARCHAR(30) NOT NULL UNIQUE,
  nombre_equipo VARCHAR(150) NOT NULL,
  acuerdo_nivel_servicio_dh SMALLINT NOT NULL CHECK (acuerdo_nivel_servicio_dh > 0),
  estado VARCHAR(10) NOT NULL CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  ruta_numero VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tecnicos_acceso (
  id BIGSERIAL PRIMARY KEY,
  cedula VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  ruta_numero VARCHAR(20) NOT NULL,
  password_hash VARCHAR(64) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE plantillas (
  id BIGSERIAL PRIMARY KEY,
  modulo VARCHAR(100) NOT NULL,
  observacion_estandar TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plantillas_modulo UNIQUE (modulo)
);

CREATE TABLE hallazgos (
  id BIGSERIAL PRIMARY KEY,
  equipo_id BIGINT NOT NULL,
  tipo_mantenimiento VARCHAR(40) NOT NULL,
  modulo VARCHAR(100) NOT NULL,
  descripcion_hallazgo TEXT NOT NULL,
  cotizacion VARCHAR(5) NOT NULL CHECK (cotizacion IN ('SI', 'NO', 'NA')),
  observacion TEXT,
  estado VARCHAR(12) NOT NULL CHECK (estado IN ('ABIERTO', 'PENDIENTE', 'SOLUCIONADO')),
  fecha_hallazgo DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_solucion DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_hallazgos_equipo
    FOREIGN KEY (equipo_id)
    REFERENCES equipos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_hallazgos_fechas
    CHECK (fecha_solucion IS NULL OR fecha_solucion >= fecha_hallazgo)
);

CREATE TABLE informes (
  id BIGSERIAL PRIMARY KEY,
  mantenimiento_id INTEGER NULL,
  equipo_id BIGINT NULL,
  modulos_text TEXT NOT NULL DEFAULT '[]',
  observaciones TEXT NOT NULL,
  pendientes TEXT,
  recomendaciones TEXT,
  plantillas_aplicadas_text TEXT NOT NULL DEFAULT '[]',
  fecha_generacion TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_informes_equipo
    FOREIGN KEY (equipo_id)
    REFERENCES equipos(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);
CREATE INDEX IF NOT EXISTS idx_hallazgos_equipo_id ON hallazgos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_hallazgos_estado ON hallazgos(estado);
CREATE INDEX IF NOT EXISTS idx_hallazgos_modulo ON hallazgos(modulo);
CREATE INDEX IF NOT EXISTS idx_informes_equipo_id ON informes(equipo_id);
CREATE INDEX IF NOT EXISTS idx_informes_fecha_generacion ON informes(fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_tecnicos_acceso_ruta_numero ON tecnicos_acceso(ruta_numero);

DROP TRIGGER IF EXISTS trg_equipos_updated_at ON equipos;
CREATE TRIGGER trg_equipos_updated_at
BEFORE UPDATE ON equipos
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_tecnicos_acceso_updated_at ON tecnicos_acceso;
CREATE TRIGGER trg_tecnicos_acceso_updated_at
BEFORE UPDATE ON tecnicos_acceso
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_hallazgos_updated_at ON hallazgos;
CREATE TRIGGER trg_hallazgos_updated_at
BEFORE UPDATE ON hallazgos
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_plantillas_updated_at ON plantillas;
CREATE TRIGGER trg_plantillas_updated_at
BEFORE UPDATE ON plantillas
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_informes_updated_at ON informes;
CREATE TRIGGER trg_informes_updated_at
BEFORE UPDATE ON informes
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

-- 4) VALIDACIONES STAGING ANTES DE CARGA
-- Ejecuta estas consultas DESPUES de importar CSV en stg_*.
-- Si devuelven filas, corrige en staging antes de continuar.

-- Duplicados de id_equipo
-- SELECT btrim(id_equipo) AS id_equipo, COUNT(*)
-- FROM stg_equipos
-- GROUP BY btrim(id_equipo)
-- HAVING COUNT(*) > 1;

-- Estados invalidos de equipo
-- SELECT *
-- FROM stg_equipos
-- WHERE upper(btrim(estado)) NOT IN ('ACTIVO', 'INACTIVO');

-- SLA invalido (esperado nDH)
-- SELECT *
-- FROM stg_equipos
-- WHERE btrim(COALESCE(acuerdo_nivel_servicio, '')) !~* '^[0-9]+\s*DH$';

-- Hallazgos sin id_equipo
-- SELECT *
-- FROM stg_hallazgos
-- WHERE btrim(COALESCE(id_equipo, '')) = '';

-- 5) CARGA A TABLAS FINALES (IDEMPOTENTE)

INSERT INTO equipos (id_equipo, nombre_equipo, acuerdo_nivel_servicio_dh, estado)
SELECT
  btrim(se.id_equipo),
  btrim(se.nombre_equipo),
  fn_parse_dh(se.acuerdo_nivel_servicio),
  upper(btrim(se.estado))
FROM stg_equipos se
WHERE btrim(COALESCE(se.id_equipo, '')) <> ''
ON CONFLICT (id_equipo) DO UPDATE
SET
  nombre_equipo = EXCLUDED.nombre_equipo,
  acuerdo_nivel_servicio_dh = EXCLUDED.acuerdo_nivel_servicio_dh,
  estado = EXCLUDED.estado,
  updated_at = NOW();

INSERT INTO plantillas (modulo, observacion_estandar)
SELECT
  btrim(sp.modulo),
  btrim(sp.observacion_estandar)
FROM stg_plantillas sp
WHERE btrim(COALESCE(sp.modulo, '')) <> ''
  AND btrim(COALESCE(sp.observacion_estandar, '')) <> ''
ON CONFLICT (modulo) DO UPDATE
SET
  observacion_estandar = EXCLUDED.observacion_estandar,
  updated_at = NOW();

INSERT INTO hallazgos (
  equipo_id,
  tipo_mantenimiento,
  modulo,
  descripcion_hallazgo,
  cotizacion,
  observacion,
  estado,
  fecha_hallazgo,
  fecha_solucion
)
SELECT
  e.id,
  COALESCE(NULLIF(btrim(sh.tipo_mantenimiento), ''), 'PREVENTIVO') AS tipo_mantenimiento,
  btrim(sh.modulo),
  btrim(sh.descripcion_hallazgo),
  CASE
    WHEN upper(btrim(COALESCE(sh.cotizacion, ''))) IN ('SI', 'SÍ') THEN 'SI'
    WHEN upper(btrim(COALESCE(sh.cotizacion, ''))) IN ('NO') THEN 'NO'
    WHEN upper(btrim(COALESCE(sh.cotizacion, ''))) IN ('N/A', 'NA') THEN 'NA'
    ELSE 'NA'
  END AS cotizacion,
  NULLIF(btrim(sh.observacion), '') AS observacion,
  CASE
    WHEN upper(btrim(COALESCE(sh.estado, ''))) IN ('ABIERTO') THEN 'ABIERTO'
    WHEN upper(btrim(COALESCE(sh.estado, ''))) IN ('PENDIENTE') THEN 'PENDIENTE'
    WHEN upper(btrim(COALESCE(sh.estado, ''))) IN ('SOLUCIONADO', 'CERRADO') THEN 'SOLUCIONADO'
    ELSE 'ABIERTO'
  END AS estado,
  COALESCE(fn_parse_date_flexible(sh.fecha_hallazgo), CURRENT_DATE) AS fecha_hallazgo,
  fn_parse_date_flexible(sh.fecha_solucion) AS fecha_solucion
FROM stg_hallazgos sh
JOIN equipos e
  ON e.id_equipo = btrim(sh.id_equipo)
WHERE btrim(COALESCE(sh.modulo, '')) <> ''
  AND btrim(COALESCE(sh.descripcion_hallazgo, '')) <> '';

COMMIT;

-- 6) VERIFICACION POST-CARGA
-- Conteo rapido
-- SELECT 'equipos' AS tabla, COUNT(*) AS total FROM equipos
-- UNION ALL
-- SELECT 'plantillas', COUNT(*) FROM plantillas
-- UNION ALL
-- SELECT 'hallazgos', COUNT(*) FROM hallazgos;
-- UNION ALL
-- SELECT 'informes', COUNT(*) FROM informes;

-- Hallazgos huerfanos (debe ser 0 por FK)
-- SELECT COUNT(*) FROM hallazgos h
-- LEFT JOIN equipos e ON e.id = h.equipo_id
-- WHERE e.id IS NULL;

-- Estados fuera de catalogo (debe ser 0)
-- SELECT * FROM hallazgos
-- WHERE estado NOT IN ('ABIERTO', 'PENDIENTE', 'SOLUCIONADO');
