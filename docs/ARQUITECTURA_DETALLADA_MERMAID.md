# Arquitectura detallada del sistema (Mermaid)

Este diagrama traduce el planteamiento MVP de [PLANTEAMIENTO.md](../PLANTEAMIENTO.md) a una vista de arquitectura lógica y flujo operativo.

```mermaid
flowchart TB
  %% =========================
  %% ACTORES Y CANALES
  %% =========================
  U[Tecnico de mantenimiento]

  subgraph FE[Frontend Web SPA]
    FE1[Pantalla Inicio / Equipos del dia habil\nHU-01, RF-01, RF-02]
    FE2[Gestion de hallazgos\nHU-02, RF-03, RF-04, RF-05]
    FE3[Generador de informe\nHU-03, RF-06, RF-07, RF-08, RF-09]
  end

  %% =========================
  %% BACKEND API (NESTJS)
  %% =========================
  subgraph API[Backend API NestJS]
    A0[Auth / autorizacion basica\nRNF-06]

    subgraph C1[Modulo Equipos]
      A1[GET /equipos\n- Calcula dia habil\n- Filtra por id/nombre\n- Solo equipos activos del dia]
      A1b[GET /calendario/mes\nContexto de dias habiles]
    end

    subgraph C2[Modulo Hallazgos]
      A2[GET /hallazgos\n- Ultimos 5 meses por defecto\n- Filtros por equipo/estado/modulo]
      A3[PATCH /hallazgos/:id/estado\n- Pendiente | Solucionado\n- fecha_solucion cuando aplica]
      A4[POST /hallazgos\n- Nuevo hallazgo si problema es diferente\n- Asociacion a equipo/mantenimiento/modulo]
    end

    subgraph C3[Modulo Informes]
      A5[POST /informes/generar\n- 1 a 3 modulos\n- Plantilla por modulo\n- Secciones: abiertos/pendientes/solucionados]
      A6[POST /informes\nGuardar informe final editable]
      A7[GET /informes\nConsulta historica]
    end

    subgraph C4[Reglas de negocio]
      R1[Equipo debe pertenecer a ruta del usuario\nMensaje: Equipo no pertenece a la ruta]
      R2[Estado hallazgo valido:\nAbierto | Pendiente | Solucionado]
      R3[Sin plantilla de modulo -> redaccion manual]
      R4[Maximo 3 modulos por mantenimiento]
      R5[No duplicar hallazgo involuntariamente\nDecision tecnica: actualizar vs crear]
    end

    subgraph C5[Servicios auxiliares]
      S1[Servicio de calendario habil\n(considera fines de semana y festivos)]
      S2[Cache de festivos\n(data/holidays-cache.json)]
    end
  end

  %% =========================
  %% DATOS
  %% =========================
  subgraph DB[PostgreSQL]
    E1[(equipo\nid_equipo, nombre_equipo, dia_habil, estado)]
    E2[(mantenimiento\nid_mantenimiento, id_equipo, fecha_mantenimiento, tipo_mantenimiento)]
    E3[(modulo\nid_modulo, nombre_modulo)]
    E4[(hallazgo\nid_hallazgo, id_equipo, id_mantenimiento, id_modulo, descripcion, estado, fecha_solucion, cotizacion, observacion)]
    E5[(plantilla\nid_modulo, texto_plantilla)]
    E6[(informe\nid_informe, id_mantenimiento, observaciones, pendientes)]
  end

  %% =========================
  %% INTERACCIONES PRINCIPALES
  %% =========================
  U --> FE1
  U --> FE2
  U --> FE3

  FE1 --> A0
  FE2 --> A0
  FE3 --> A0

  FE1 --> A1
  FE1 --> A1b
  FE2 --> A2
  FE2 --> A3
  FE2 --> A4
  FE3 --> A5
  FE3 --> A6
  FE3 --> A7

  A1 --> R1
  A2 --> R1
  A4 --> R1
  A3 --> R2
  A4 --> R2
  A4 --> R5
  A5 --> R3
  A5 --> R4

  A1 --> S1
  A1b --> S1
  S1 --> S2

  A1 --> E1
  A2 --> E4
  A3 --> E4
  A4 --> E1
  A4 --> E2
  A4 --> E3
  A4 --> E4
  A5 --> E3
  A5 --> E4
  A5 --> E5
  A6 --> E6
  A7 --> E6

  E2 --> E1
  E4 --> E1
  E4 --> E2
  E4 --> E3
  E5 --> E3
  E6 --> E2

  %% =========================
  %% OBJETIVOS NO FUNCIONALES (ANOTACION)
  %% =========================
  N1[RNF-01: consultas < 3s]
  N2[RNF-02: generacion informe < 5s]
  N3[RNF-03: integridad y unicidad de hallazgos]
  N4[RNF-05: consistencia UI = DB]

  A1 -.-> N1
  A2 -.-> N1
  A5 -.-> N2
  A4 -.-> N3
  A6 -.-> N4
```

## Notas de lectura

- El flujo del MVP se centra en tres capacidades: consultar equipos del dia, gestionar hallazgos y generar/guardar informes.
- La regla de ruta del usuario aplica tanto en consulta como en registro de hallazgos.
- El informe se genera por plantillas de modulo, con fallback a redaccion manual cuando no exista plantilla.
- El historial se conserva completo, incluyendo hallazgos solucionados.
