# Backend MVP de mantenimiento

## Estructura inicial

- src/main.ts: arranque de la aplicación NestJS.
- src/app.module.ts: módulo raíz con los módulos del negocio.
- src/equipos/: gestión de equipos programados y búsqueda.
- src/hallazgos/: consulta, creación y actualización de hallazgos.
- src/informes/: generación y persistencia de informes.
- src/plantillas/: carga de plantillas por módulo.

## Siguiente paso recomendado

1. Instalar dependencias.
2. Configurar PostgreSQL.
3. Definir entidades y migraciones.
4. Conectar NestJS con la base de datos.
5. Exponer endpoints reales para equipos, hallazgos e informes.

## Comandos

```bash
npm install --legacy-peer-deps
npm run start:dev
```
