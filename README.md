# Sistema de Gestion de Hallazgos e Informes de Mantenimiento

Aplicacion web para que un tecnico de mantenimiento consulte los equipos programados del dia habil, gestione hallazgos historicos y genere informes de mantenimiento a partir de plantillas por modulo.

El repositorio esta dividido en dos aplicaciones:

- `backend/`: API NestJS con PostgreSQL.
- `frontend/`: SPA React + TypeScript + Vite.

## Objetivo del MVP

El MVP cubre tres flujos principales:

1. Consultar automaticamente los equipos programados para el dia habil actual.
2. Revisar, crear y actualizar hallazgos de los ultimos cinco meses.
3. Generar y guardar informes de mantenimiento usando plantillas por modulo.

## Stack real del proyecto

- Backend: NestJS, TypeORM, PostgreSQL.
- Frontend: React, TypeScript, Vite, Tailwind.
- Utilidades: PowerShell para scripts de levantamiento local.

Nota: el planteamiento funcional menciona Angular, pero la implementacion actual del frontend esta hecha en React.

## Estructura del repositorio

```text
.
|-- backend/
|   |-- src/
|   |-- scripts/
|   |-- sql/
|   `-- test/
|-- frontend/
|   `-- src/
|-- scripts/
|-- docs/
|-- spec generales/
|-- PLANTEAMIENTO.md
`-- analisis_planteamiento.md
```

## Modulos funcionales

### Backend

- `auth`: login tecnico y resolucion de ruta operativa.
- `equipos`: consulta de equipos programados, filtros y logica de dia habil.
- `hallazgos`: consulta, creacion, actualizacion e historial de estados.
- `informes`: preview, generacion y persistencia de informes.
- `plantillas`: catalogo de plantillas por modulo.
- `modulos`: catalogo de modulos permitidos.
- `mantenimientos`: soporte de entidad y relaciones de mantenimiento.

### Frontend

- Inicio con calendario operativo y tarjetas KPI.
- Busqueda de equipos.
- Gestion de hallazgos.
- Generacion de informes con editor.
- Historial de mantenimientos.

## Requisitos

- Node.js 20 o superior recomendado.
- npm.
- PostgreSQL accesible desde el backend.
- PowerShell 5.1 o superior en Windows.

## Configuracion local

Crear o completar `backend/.env` con los datos de conexion a PostgreSQL.

Variables usadas por el backend:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT` opcional, por defecto `3000`
- `HOLIDAYS` opcional, lista CSV de fechas ISO
- `AUTH_DEFAULT_USUARIO` opcional
- `AUTH_DEFAULT_PASSWORD` opcional
- `AUTH_DEFAULT_CEDULA` opcional
- `AUTH_DEFAULT_NOMBRE` opcional
- `AUTH_DEFAULT_RUTA` opcional

## Instalacion

Instala dependencias por aplicacion:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

## Ejecucion local

### Opcion recomendada

Levanta backend y frontend con el script de orquestacion:

```powershell
npm run dev:up
```

Este script:

- libera los puertos `3000`, `5173` y `5174`,
- inicia backend y frontend,
- espera disponibilidad HTTP,
- ejecuta un smoke test basico,
- guarda estado de procesos en `.runtime/`.

Para detener ambos servicios:

```powershell
npm run dev:down
```

### Ejecucion manual

Backend:

```powershell
npm --prefix backend run start:dev
```

Frontend:

```powershell
npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173
```

## URLs locales

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Scripts disponibles

### Raiz

- `npm run dev:up`
- `npm run dev:down`

### Backend

- `npm --prefix backend run build`
- `npm --prefix backend run start`
- `npm --prefix backend run start:dev`
- `npm --prefix backend run test`
- `npm --prefix backend run auth:list-users`

### Frontend

- `npm --prefix frontend run dev`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run preview`

## Endpoints principales

### Autenticacion

- `POST /auth/login`

### Equipos

- `GET /equipos`
- `GET /calendario/mes?fecha=YYYY-MM-DD`

### Hallazgos

- `GET /hallazgos`
- `GET /hallazgos/:id/historial-estados`
- `POST /hallazgos`
- `PATCH /hallazgos/:id`
- `PUT /hallazgos/:id`

### Informes

- `GET /informes`
- `POST /informes/preview`
- `POST /informes`
- `PATCH /informes/:id/finalizar`

### Catalogos

- `GET /plantillas`

## Reglas de negocio relevantes

- Los equipos operativos del dia se calculan por dia habil.
- Los hallazgos se consultan por defecto sobre una ventana de cinco meses.
- Un hallazgo puede estar en `ABIERTO`, `PENDIENTE` o `SOLUCIONADO`.
- Si un hallazgo se soluciona, se registra `fechaSolucion`.
- Un informe solo admite entre 1 y 3 modulos.
- Si no existe plantilla para un modulo, el contenido se puede redactar manualmente.

## Documentacion del repositorio

- `PLANTEAMIENTO.md`: planteamiento funcional base.
- `analisis_planteamiento.md`: auditoria de cumplimiento frente al planteamiento.
- `docs/ARQUITECTURA_DETALLADA_MERMAID.md`: arquitectura funcional detallada en Mermaid.
- `spec generales/`: especificaciones funcionales y de datos.
- `backend/docs/mvp-endpoints.http`: coleccion de pruebas manuales de endpoints.

## Estado actual

El proyecto ya implementa el flujo principal del MVP:

- consulta operativa de equipos,
- gestion de hallazgos,
- generacion y guardado de informes,
- scripts de arranque local,
- smoke test basico.

Brechas tecnicas identificadas en la auditoria:

- falta endurecer autenticacion y autorizacion de endpoints de escritura,
- parte del esquema se ajusta en runtime y conviene migrarlo a migraciones versionadas,
- faltan pruebas formales de rendimiento con umbrales contractuales.

## Recomendaciones para continuar

1. Proteger endpoints criticos con autenticacion fuerte y guards.
2. Formalizar migraciones de base de datos.
3. Agregar pruebas de performance y autorizacion.
4. Mantener sincronizados `PLANTEAMIENTO.md` y la implementacion real del frontend.