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

## Configuracion local con DBeaver

1. Abre la conexion que ya usaste en DBeaver y revisa estos datos:
	 - Host
	 - Port
	 - Database
	 - Username
	 - Password
2. Abre el archivo [backend/.env](./.env).
3. Si tu conexion en DBeaver usa valores distintos, reemplaza ahi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.
4. Guarda el archivo y ejecuta:

```bash
npm run start:dev
```

Si la conexion es correcta, NestJS quedara escuchando por defecto en `http://localhost:3000`.

### Calendario de dias habiles

El backend calcula los dias habiles usando el calendario oficial de festivos de Colombia desde la API publica de Nager.Date y excluye sabados, domingos y feriados nacionales.
Si la API no responde, el sistema reutiliza un cache local en `data/holidays-cache.json`; como ultimo respaldo, mantiene compatibilidad con `date-holidays`.
Si necesitas añadir o reemplazar feriados manualmente, define `HOLIDAYS` con fechas ISO separadas por coma.

Endpoint auxiliar para el frontend:

- `GET http://localhost:3000/calendario/mes?fecha=YYYY-MM-DD`

Responde con el contexto del dia habil y la lista de dias habiles del mes para poder recalcular el DH en la interfaz sin duplicar logica.

## Probar endpoints

Pruebas rapidas desde el navegador o Postman:

- `GET http://localhost:3000/equipos`
- `GET http://localhost:3000/equipos?q=compresor`
- `GET http://localhost:3000/hallazgos`
- `GET http://localhost:3000/hallazgos?equipoId=1`
- `GET http://localhost:3000/hallazgos?estado=ABIERTO`
- `GET http://localhost:3000/plantillas`
- `GET http://localhost:3000/plantillas?modulo=electrico`

Pruebas desde PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/equipos
Invoke-RestMethod "http://localhost:3000/equipos?q=compresor"
Invoke-RestMethod http://localhost:3000/hallazgos
Invoke-RestMethod "http://localhost:3000/hallazgos?equipoId=1"
Invoke-RestMethod http://localhost:3000/plantillas
```

Crear un hallazgo de prueba:

```powershell
$body = @{
	equipoId = 1
	tipoMantenimiento = 'PREVENTIVO'
	modulo = 'electrico'
	descripcionHallazgo = 'Prueba desde API'
	cotizacion = 'NO'
	observacion = 'Creado para validar endpoint'
	estado = 'ABIERTO'
	fechaHallazgo = '2026-07-12'
} | ConvertTo-Json

Invoke-RestMethod http://localhost:3000/hallazgos -Method Post -ContentType 'application/json' -Body $body
```

Actualizar un hallazgo de prueba:

```powershell
$body = @{
	estado = 'SOLUCIONADO'
	fechaSolucion = '2026-07-12'
} | ConvertTo-Json

Invoke-RestMethod http://localhost:3000/hallazgos/1 -Method Patch -ContentType 'application/json' -Body $body
```

## Reinicio y carga semanal de hallazgos

Para iniciar una nueva semana sin datos historicos en hallazgos/reportes:

```bash
npm run hallazgos:reset-semana
```

Para cargar hallazgos desde archivo JSON:

```bash
npm run hallazgos:cargar-semana
```

Archivo por defecto de carga:

- `data/hallazgos-carga-semana.json`

Formato esperado:

```json
{
	"hallazgos": [
		{
			"equipoId": 1,
			"mantenimientoId": 10,
			"tipoMantenimiento": "PREVENTIVO",
			"modulo": "SISTEMA ELECTRIFICACION",
			"descripcionHallazgo": "Ruido intermitente en tablero de control",
			"cotizacion": "SI",
			"observacion": "Se requiere revision de contactores",
			"estado": "ABIERTO",
			"fechaHallazgo": "2026-08-03",
			"fechaSolucion": null
		}
	]
}
```

Notas:

- `equipoId` o `codigoEquipo` es obligatorio en cada registro.
- Si no envias `fechaHallazgo`, se usa la fecha actual.
- Por defecto el script exige fecha dentro de la semana actual (lunes a domingo).
- Para permitir fechas fuera de semana actual, usa:

```bash
node ./scripts/cargar-hallazgos-semana.js --allow-outside-week
```
