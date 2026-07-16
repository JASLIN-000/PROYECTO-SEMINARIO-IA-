# Spec 2: Consulta de equipos programados y búsqueda

## 1. Objetivo
Permitir al técnico de mantenimiento visualizar automáticamente los equipos programados para el día hábil actual y buscarlos por ID o nombre con rapidez.

## 2. Alcance del módulo
Este módulo cubre:
- Consulta automática de equipos del día hábil actual.
- Búsqueda por ID o nombre del equipo.
- Visualización de información básica del equipo para iniciar la intervención.
- Acceso al historial de hallazgos del equipo seleccionado.
 - Exposición de una API pública para consultas y filtros simples (`/equipos`).

## 3. Actores
- Técnico de mantenimiento.

## 4. Historia de usuario
Como técnico de mantenimiento, quiero visualizar automáticamente los equipos programados para el día hábil actual y buscarlos por ID o nombre, para iniciar rápidamente la intervención sin consultar varias fuentes manualmente.

## 5. Requisitos funcionales
- RF-01: El sistema debe mostrar automáticamente los equipos programados para el día hábil actual.
- RF-02: El sistema debe permitir buscar equipos por ID o por nombre del equipo.
- RF-03: El sistema debe mostrar al menos los campos id_equipo, nombre_equipo, acuerdo_nivel_servicio y estado.
- RF-04: El sistema debe permitir seleccionar un equipo para acceder a su historial de hallazgos.
- RF-05: El sistema debe mostrar un mensaje claro cuando no existan equipos para el día.

## 6. Requisitos no funcionales
- RNF-01: La consulta debe responder en menos de 3 segundos.
- RNF-02: La interfaz debe permitir acceder a la información principal en tres acciones o menos.
- RNF-03: Los datos mostrados deben coincidir con la información almacenada en la base de datos.

## 7. Reglas de negocio
- Solo deben mostrarse equipos cuya programación coincida con el día hábil actual.
- La búsqueda debe filtrar por coincidencia parcial o exacta de ID o nombre.
- Si no hay equipos programados para el día, la lista debe quedar vacía y mostrar un mensaje informativo.
- El equipo seleccionado debe permitir continuar al flujo de revisión de hallazgos.

Nota técnica: la API admite filtros opcionales `q` (término de búsqueda, aplica a `id`, `idEquipo` y `nombreEquipo`), `rutaNumero` (coincidencia exacta) y `fecha` (para forzar el cálculo del día hábil en una fecha concreta).

## 8. Flujo principal
1. El técnico ingresa al sistema.
2. El sistema calcula el día hábil actual.
3. Se muestran los equipos programados para ese día.
4. El técnico puede buscar por ID o nombre.
5. El técnico selecciona un equipo para continuar con la intervención.

## 9. Criterios de aceptación
- Al ingresar, el usuario ve únicamente los equipos del día hábil actual.
- La búsqueda devuelve resultados consistentes con el texto ingresado.
- La consulta se ejecuta en menos de 3 segundos.
- El equipo seleccionado permite acceder a su historial de hallazgos.

- Respuesta HTTP 200 con cuerpo JSON que contiene `calendario` y `equipos`.
- Cuando `calendario.isBusinessDay` es `false`, `equipos` debe ser un arreglo vacío.
- Cada objeto en `equipos` debe contener al menos: `id` (number), `idEquipo` (string), `nombreEquipo` (string), `acuerdoNivelServicioDh` (number), `estado` (string), `rutaNumero` (string|null).

## 10. Fuera de alcance
- Filtros avanzados por ubicación o prioridad.
- Programación de equipos desde la interfaz.

## 11. Especificación de API (endpoints a probar)

- **GET /equipos**
	- Descripción: Devuelve objetos de equipos programados para el día hábil calculado (o vacíos si no es día hábil).
	- Parámetros query:
		- `q` (opcional): término de búsqueda (coincidencia parcial sobre `idEquipo`, `nombreEquipo` o `id`).
		- `rutaNumero` (opcional): filtra por número de ruta (coincidencia exacta, case-insensitive).
		- `fecha` (opcional): ISO date (YYYY-MM-DD) para forzar el cálculo del día hábil en una fecha concreta.
	- Respuesta: `200 OK` con JSON:

```json
{
	"calendario": { "isBusinessDay": true, "businessDayIndex": 2 },
	"equipos": [
		{
			"id": 1,
			"idEquipo": "EQ-001",
			"nombreEquipo": "Compresor A",
			"acuerdoNivelServicioDh": 2,
			"estado": "PENDIENTE",
			"rutaNumero": "R-12",
			"slaDiasHabiles": 2,
			"slaHoras": 48,
			"acuerdoNivelServicio": "2DH"
		}
	]
}
```

- **Comportamiento esperado**:
	- Si `calendario.isBusinessDay === false` → `equipos: []`.
	- Si se pasa `q`, los resultados contienen solo coincidencias parciales o exactas.
	- Filtrado por `rutaNumero` devuelve solo equipos con esa ruta.

- **GET /hallazgos?codigoEquipo={idEquipo}** (relacionado)
	- Descripción: Recupera hallazgos asociados a `idEquipo` visible (se prueba para verificar que seleccionar un equipo permite ver su historial).
	- Probar que, al seleccionar un equipo en la UI, la API `GET /hallazgos?codigoEquipo=...` devuelve los registros esperados.

## 12. Casos de prueba recomendados (paso a paso)

1. "Carga inicial día hábil"
	 - Paso: `GET /equipos` sin parámetros en una fecha que sea día hábil.
	 - Esperado: `200`, `calendario.isBusinessDay === true`, `equipos.length > 0`, cada objeto con campos mínimos.

2. "Carga inicial no día hábil"
	 - Paso: `GET /equipos?fecha=2026-07-11` (ejemplo fin de semana) o cualquier fecha no hábil.
	 - Esperado: `200`, `calendario.isBusinessDay === false`, `equipos.length === 0`.

3. "Búsqueda por texto (parcial)"
	 - Paso: `GET /equipos?q=compresor`
	 - Esperado: `200`, todos los `equipos` devueltos contienen `compresor` en `nombreEquipo` o `idEquipo` (case-insensitive).

4. "Búsqueda por ID numérico"
	 - Paso: `GET /equipos?q=1` (o el id real)
	 - Esperado: `200`, incluye equipo con `id` igual a 1.

5. "Filtrado por ruta"
	 - Paso: `GET /equipos?rutaNumero=R-12`
	 - Esperado: `200`, solo equipos con `rutaNumero` igual a `R-12`.

6. "Selección de equipo y consulta de hallazgos"
	 - Paso: Obtener un `idEquipo` de la respuesta y llamar a `GET /hallazgos?codigoEquipo={idEquipo}`.
	 - Esperado: `200`, la lista de hallazgos corresponde al equipo seleccionado.

7. "Rendimiento"
	 - Paso: Medir tiempo de respuesta para `GET /equipos` (promedio de 5 ejecuciones).
	 - Esperado: tiempo < 3000 ms en entorno local con datos de prueba.

8. "Campos y tipos"
	 - Validar que cada campo exigido existe y es del tipo correcto (ej.: `id` number, `idEquipo` string).

## 13. Criterios adicionales y notas de verificación

- Autenticación: `GET /equipos` no requiere autenticación (según implementación actual). Verificar si la política cambia.
- Errores: en caso de excepción, el servicio debe retornar `200` con `equipos: []` y un `calendario` calculado (según implementación actual) — anotar esto como comportamiento observado y, si se prefiere, cambiar a `500` en futuras revisiones.
- Indexación: la columna `ruta_numero` se crea automáticamente si falta — verificar que las consultas por `rutaNumero` usan índice.

## 14. Entregable

- He completado y pulido el spec con:
	- Descripción de endpoints y parámetros.
	- Ejemplos de respuesta JSON.
	- Casos de prueba paso a paso y criterios de aceptación precisos.

---
Si quieres, aplico pruebas automáticas básicas (scripts de `curl`/PowerShell o Postman collection) para correr los casos listados y generar un informe de resultados.
