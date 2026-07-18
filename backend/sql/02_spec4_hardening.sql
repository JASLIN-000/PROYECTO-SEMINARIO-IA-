-- SPEC4 hardening migration (Prioridad 2 y 3)
-- Safe to run multiple times.

BEGIN;

-- 1) Formalize modulos catalog
CREATE TABLE IF NOT EXISTS modulos (
  id BIGSERIAL PRIMARY KEY,
  nombre_modulo VARCHAR(200) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO modulos (nombre_modulo)
VALUES
  ('VERIFICACION DE SEGURIDAD Y CALIDAD'),
  ('LIMPIEZA L1'),
  ('LIMPIEZA L2'),
  ('SISTEMA PARACAIDA, LIMITADOR DE VELOCIDAD Y PESACARGAS'),
  ('LIMPIEZA L3'),
  ('SISTEMA MAQUINA FRENO'),
  ('SISTEMA SUSPENSION'),
  ('SISTEMA ELECTRIFICACION'),
  ('SISTEMA PUERTAS DE CABINA'),
  ('SISTEMA PUERTAS DE PISO'),
  ('ACTUALIZAR EQUIPO'),
  ('CAMBIO DE CABLES')
ON CONFLICT (nombre_modulo) DO NOTHING;

-- 2) Formalize mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos (
  id_mantenimiento BIGSERIAL PRIMARY KEY,
  equipo_id BIGINT NOT NULL REFERENCES equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  fecha_mantenimiento DATE NOT NULL,
  tipo_mantenimiento VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_equipo_id ON mantenimientos(equipo_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha_mantenimiento DESC);

-- 3) Hallazgos metadata and estado history
ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS mantenimiento_id INTEGER NULL;
ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS hallazgo_estado_historial (
  id BIGSERIAL PRIMARY KEY,
  hallazgo_id BIGINT NOT NULL REFERENCES hallazgos(id) ON UPDATE CASCADE ON DELETE CASCADE,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo VARCHAR(20) NOT NULL,
  motivo VARCHAR(60) NOT NULL,
  fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hallazgos_fecha_hallazgo ON hallazgos(fecha_hallazgo DESC);
CREATE INDEX IF NOT EXISTS idx_hallazgos_modulo ON hallazgos(modulo);
CREATE INDEX IF NOT EXISTS idx_hallazgos_mantenimiento_id ON hallazgos(mantenimiento_id);
CREATE INDEX IF NOT EXISTS idx_hallazgo_estado_historial_hallazgo_id ON hallazgo_estado_historial(hallazgo_id, fecha_cambio DESC);

-- 4) Unique business identifier (case-insensitive) for equipos.id_equipo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'equipos'
      AND indexname = 'ux_equipos_id_equipo_ci'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM (
        SELECT LOWER(id_equipo) AS id_equipo_norm
        FROM equipos
        GROUP BY LOWER(id_equipo)
        HAVING COUNT(*) > 1
      ) dup
    ) THEN
      CREATE UNIQUE INDEX ux_equipos_id_equipo_ci ON equipos (LOWER(id_equipo));
    END IF;
  END IF;
END
$$;

COMMIT;
