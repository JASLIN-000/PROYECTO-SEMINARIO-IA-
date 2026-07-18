-- SPEC2 data hardening: enforce contiguous business-day service levels by route.
-- For active equipos, each route must have SLA days 1..N with no gaps.
-- Safe to run multiple times.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    DENSE_RANK() OVER (
      PARTITION BY LOWER(BTRIM(ruta_numero))
      ORDER BY acuerdo_nivel_servicio_dh
    ) AS normalized_dh
  FROM equipos
  WHERE UPPER(estado) = 'ACTIVO'
    AND ruta_numero IS NOT NULL
    AND BTRIM(ruta_numero) <> ''
    AND acuerdo_nivel_servicio_dh IS NOT NULL
)
UPDATE equipos equipo
SET acuerdo_nivel_servicio_dh = ranked.normalized_dh
FROM ranked
WHERE equipo.id = ranked.id
  AND equipo.acuerdo_nivel_servicio_dh IS DISTINCT FROM ranked.normalized_dh;

COMMIT;
