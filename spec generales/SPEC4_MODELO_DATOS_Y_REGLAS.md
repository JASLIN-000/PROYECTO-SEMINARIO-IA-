# SPEC4: Modelo de Datos y Reglas Transversales

## 1. Objetivo
Definir el modelo de datos canonico del MVP y las reglas de negocio transversales para asegurar:

- consistencia funcional entre SPEC1, SPEC2 y SPEC3,
- trazabilidad completa de hallazgos e informes,
- integridad de datos en PostgreSQL,
- comportamiento predecible entre backend y frontend.

Este documento es normativo: ante conflicto, prevalece SPEC4 para datos y reglas comunes.

## 2. Alcance
Aplica a:

- estructuras de datos persistidas,
- contratos logicos de entrada/salida,
- reglas de validacion,
- transiciones de estado,
- trazabilidad e historico,
- reglas de generacion de informe.

No define UI visual ni estilo de pantalla.

## 3. Modelo de dominio (entidades)

### 3.1 Equipo
Representa un activo mantenible.

Campos minimos:

- id (PK tecnica, autogenerada)
- id_equipo (obligatorio, unico, identificador de negocio)
- nombre_equipo (obligatorio)
- acuerdo_nivel_servicio_dh (obligatorio, entero 1..5)
- estado (obligatorio: ACTIVO, INACTIVO)
- ruta_numero (opcional, para segregacion operativa)

Reglas:

- Solo equipos ACTIVO pueden intervenirse.
- acuerdo_nivel_servicio_dh define el dia habil de programacion del equipo.

### 3.2 Mantenimiento
Representa un evento de mantenimiento ejecutado o planificado.

Campos minimos:

- id_mantenimiento (PK o identificador unico)
- id_equipo (FK a Equipo, obligatorio)
- fecha_mantenimiento (obligatorio)
- tipo_mantenimiento (obligatorio: PREVENTIVO, CORRECTIVO u otro catalogado)

Reglas:

- Todo mantenimiento pertenece a un solo equipo.
- Un mantenimiento puede tener muchos hallazgos.

Nota MVP:

- En la version actual puede representarse de forma simplificada por referencia logica (mantenimiento_id) sin entidad completa, pero el contrato de negocio se mantiene.

### 3.3 Modulo
Catalogo funcional de componentes evaluables.

Campos minimos:

- id_modulo (PK o identificador unico)
- nombre_modulo (obligatorio, unico)

Reglas:

- Un hallazgo debe pertenecer a un modulo valido.
- Un informe puede incluir entre 1 y 3 modulos.

### 3.4 Hallazgo
Registro unitario de anomalia, observacion o resultado tecnico.

Campos minimos:

- id_hallazgo (PK autogenerada)
- id_equipo (FK, obligatorio)
- id_mantenimiento (FK/logico, opcional)
- id_modulo o modulo (obligatorio)
- fecha_hallazgo/fecha_mantenimiento (obligatorio)
- tipo_mantenimiento (obligatorio)
- descripcion_hallazgo (obligatorio)
- cotizacion (obligatorio: SI, NO, NA)
- observacion (opcional)
- estado (obligatorio: ABIERTO, PENDIENTE, SOLUCIONADO)
- fecha_solucion (opcional, obligatoria cuando estado=SOLUCIONADO)

Reglas:

- No se elimina historico de hallazgos por operaciones de informe.
- Debe existir trazabilidad de cambios de estado.

### 3.5 Informe
Documento tecnico generado para una intervencion.

Campos minimos:

- id_informe (PK autogenerada)
- id_mantenimiento (referencia obligatoria a nivel negocio)
- id_equipo (recomendado para trazabilidad)
- modulos_text (obligatorio, serializacion del set de modulos)
- observaciones (obligatorio, texto final del informe)
- pendientes (opcional)
- recomendaciones (opcional)
- fecha_generacion (obligatorio)

Reglas:

- El informe se persiste como texto.
- Guardar informe nunca debe modificar hallazgos historicos.
- Debe permitirse historico de versiones por equipo/mantenimiento (append-only).

### 3.6 Plantilla
Texto base reutilizable para apoyar redaccion de informes.

Campos minimos:

- id_plantilla (PK autogenerada)
- id_modulo o modulo (obligatorio)
- plantilla_observacion/observacion_estandar (obligatorio)
- plantilla_recomendacion (opcional)

Reglas:

- Un modulo puede tener una o varias plantillas asociadas.

## 4. Relaciones del modelo

- Equipo 1:N Mantenimiento
- Mantenimiento 1:N Hallazgo
- Mantenimiento 1:1..N Informe (segun politicas de versionado)
- Modulo 1:N Hallazgo
- Modulo 1:N Plantilla
- Equipo 1:N Hallazgo
- Equipo 1:N Informe

## 5. Reglas transversales obligatorias

### 5.1 Integridad y unicidad

- No deben existir duplicados de identificadores de negocio.
- Deben existir claves primarias tecnicas para todas las tablas persistentes.
- Todo FK debe apuntar a registro existente o ser null solo cuando la regla lo permita.

### 5.2 Consistencia backend-frontend

- Lo visible en UI debe provenir del estado persistido (PostgreSQL), no de caches no sincronizados.
- Los nombres y estados expuestos al frontend deben normalizarse en backend.

### 5.3 Historico y trazabilidad

- El sistema conserva historico completo de hallazgos.
- Las transiciones de estado no deben perder fecha ni contexto.
- La generacion de informe no altera hallazgos originales.

### 5.4 Estados y transiciones de hallazgo

Estados permitidos:

- ABIERTO
- PENDIENTE
- SOLUCIONADO

Reglas:

- CERRADO se normaliza a SOLUCIONADO (compatibilidad).
- Si estado=SOLUCIONADO y no existe fecha_solucion, se completa automaticamente.
- Si estado en ABIERTO/PENDIENTE, fecha_solucion debe quedar null.

### 5.5 Reglas de cotizacion

- cotizacion solo admite SI, NO o NA.
- Si hay banderas legacy, deben mapearse a este conjunto.
- El informe puede incorporar sugerencias de aprobacion cuando existan hallazgos con cotizacion=SI.

### 5.6 Reglas de programacion por dia habil

- La intervencion y/o generacion de informe debe respetar calendario habil.
- Solo equipos programados para el dia habil actual pueden generar informe.
- Si no es dia habil, la operacion debe rechazarse con mensaje de negocio claro.

### 5.7 Reglas de informe

- Debe componerse usando plantillas (si existen), datos de mantenimiento y hallazgos asociados.
- Debe permitir redaccion manual cuando falte plantilla para algun modulo.
- Debe aceptar entre 1 y 3 modulos por mantenimiento.

## 6. Catalogos y normalizacion

### 6.1 Catalogo de estados de hallazgo

- ABIERTO
- PENDIENTE
- SOLUCIONADO

### 6.2 Catalogo de cotizacion

- SI
- NO
- NA

### 6.3 Catalogo de modulos

Debe existir un set controlado de modulos admitidos por mantenimiento (maximo 3 por informe).

### 6.4 Normalizacion de texto

- Comparaciones de catalogos se realizan case-insensitive.
- Espacios multiples se reducen cuando aplique para validar igualdad logica.

## 7. Reglas de persistencia

- Informe se guarda como texto final editable.
- Hallazgos preservan fecha_hallazgo, estado y fecha_solucion historicos.
- Operaciones de preview no persisten cambios.
- Operaciones de create de informe persisten nuevo registro (append-only).

## 8. Reglas de auditoria minima (MVP)

- Cada registro nuevo debe tener fecha de creacion.
- Cada actualizacion debe conservar fecha de actualizacion.
- Debe poder reconstruirse la secuencia historica de informes y hallazgos.

## 9. Reglas de validacion minima

### 9.1 Hallazgo

- equipoId obligatorio y valido.
- modulo obligatorio y permitido.
- descripcion_hallazgo obligatoria.
- estado obligatorio y dentro de catalogo.

### 9.2 Informe

- al menos 1 modulo y maximo 3.
- observaciones obligatorias al guardar.
- equipo existente y habilitado cuando aplique regla de programacion.

### 9.3 Equipo

- id_equipo obligatorio y unico.
- nombre_equipo obligatorio.
- estado obligatorio.
- acuerdo_nivel_servicio_dh obligatorio para programacion.

## 10. Compatibilidad con SPEC1-2-3

- SPEC1 (hallazgos): se apoya en estados, cotizacion, modulo y trazabilidad historica.
- SPEC2 (equipos): se apoya en estado del equipo, dia habil y ruta.
- SPEC3 (informes): se apoya en plantillas, hallazgos historicos y restricciones de programacion.

## 11. Criterios de aceptacion de SPEC4 (100%)

Se considera SPEC4 completo cuando se cumpla todo lo siguiente:

- Modelo de datos documentado y alineado con entidades reales del sistema.
- Reglas de integridad, estado, cotizacion y programacion definidas sin ambiguedad.
- Regla de no alteracion de hallazgos por generacion de informe garantizada.
- Persistencia de informe en texto final definida.
- Trazabilidad historica de hallazgos e informes definida.
- Compatibilidad explicita con SPEC1, SPEC2 y SPEC3.

## 12. Riesgos si no se cumple SPEC4

- Inconsistencia entre UI y BD.
- Informes no reproducibles o sin trazabilidad.
- Perdida de historico de hallazgos.
- Reglas distintas por modulo o endpoint.
- Dificultad para escalar y auditar el sistema.

## 13. Matriz tecnica de cumplimiento (estado actual)

Leyenda:

- Implementado: existe en codigo y comportamiento operativo.
- Parcial: existe, pero con brecha funcional o de robustez.
- Pendiente: no implementado o no garantizado.

### 13.1 Modelo de datos

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| Entidad Equipo definida | Implementado | backend/src/common/entities/equipo.entity.ts | Sin brecha relevante |
| Entidad Hallazgo definida | Implementado | backend/src/common/entities/hallazgo.entity.ts | Sin brecha relevante |
| Entidad Informe definida | Implementado | backend/src/common/entities/informe.entity.ts | Sin brecha relevante |
| Entidad Plantilla definida | Implementado | backend/src/common/entities/plantilla.entity.ts | Sin brecha relevante |
| Entidad Mantenimiento explicita | Implementado | Entidad + modulo + servicio + controlador en backend/src/mantenimientos y common/entities/mantenimiento.entity.ts | Sin brecha relevante |
| Entidad Modulo explicita (catalogo persistido) | Implementado | Entidad Modulo y modulo Nest en backend/src/modulos; informes valida contra tabla modulos | Sin brecha relevante |

### 13.2 Integridad y unicidad

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| PK tecnicas en tablas principales | Implementado | id autogenerado en entidades principales | Sin brecha relevante |
| Unicidad de identificadores de negocio (ej. id_equipo) | Parcial | Bootstrap crea indice unico case-insensitive ux_equipos_id_equipo_ci si no hay duplicados | Ejecutar migracion formal y limpieza si existen duplicados heredados |
| FK consistentes en relaciones clave | Parcial | informes.equipo_id con FK en ensureSchema | Formalizar FKs de hallazgos y mantenimiento |

### 13.3 Reglas de hallazgos

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| Estados permitidos y normalizacion (CERRADO->SOLUCIONADO) | Implementado | backend/src/hallazgos/hallazgos.service.ts | Sin brecha relevante |
| fecha_solucion consistente segun estado | Implementado | backend/src/hallazgos/hallazgos.service.ts | Sin brecha relevante |
| Cotizacion normalizada a SI/NO/NA | Implementado | backend/src/hallazgos/hallazgos.service.ts | Sin brecha relevante |
| Evitar duplicados activos de hallazgo | Implementado | assertNoUnintentionalDuplicate en HallazgosService | Reforzar con indice compuesto opcional |
| Trazabilidad de cambios de estado (bitacora/auditoria) | Implementado | Tabla hallazgo_estado_historial + insercion en create/update de hallazgos | Sin brecha relevante |

### 13.4 Reglas de informes

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| Preview sin persistencia | Implementado | POST /informes/preview en InformesController/Service | Sin brecha relevante |
| Guardado de informe como texto | Implementado | observaciones/modulos_text en Informe entity + create | Sin brecha relevante |
| Generacion con plantillas y hallazgos | Implementado | buildDraft/loadPlantillas/loadHallazgosForDraft | Sin brecha relevante |
| Maximo 3 modulos por informe | Implementado | normalizeModules en InformesService | Sin brecha relevante |
| Historial de informes append-only | Implementado | create genera nuevo registro | Sin brecha relevante |
| Generacion no altera hallazgos | Implementado | Servicio de informes solo lectura sobre hallazgos | Sin brecha relevante |

### 13.5 Programacion operativa (dia habil y ruta)

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| Equipos del dia habil en consulta operativa | Implementado | backend/src/equipos/equipos.service.ts | Sin brecha relevante |
| Bloqueo de informe fuera de dia habil | Implementado | assertEquipoProgramadoHoy en InformesService | Sin brecha relevante |
| Restriccion por ruta (x-ruta-numero) | Implementado | HallazgosController/InformesController + servicios | Sin brecha relevante |

### 13.6 Validaciones y contratos

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| DTO validado para Informe | Implementado | backend/src/common/dto/create-informe.dto.ts + ValidationPipe global | Sin brecha relevante |
| DTO validado para Hallazgo | Implementado | create-hallazgo.dto.ts ampliado y controlador tipado con Create/Update DTO | Sin brecha relevante |
| Contratos estables de entrada/salida | Parcial | Reglas en servicio, respuestas enriquecidas | Normalizar DTOs de salida y tipado fuerte |

### 13.7 Auditoria minima

| Regla | Estado | Evidencia actual | Brecha |
|---|---|---|---|
| created_at/updated_at en informes | Implementado | esquema informes en InformesService + Informe entity | Sin brecha relevante |
| Auditoria equivalente en hallazgos | Pendiente | No hay campo/tabla de auditoria explicita | Agregar timestamps y/o bitacora |

## 14. Plan de cierre tecnico para 100% implementado

Prioridad 1:

- Crear entidad Mantenimiento completa con modulo, servicio y FK real hacia Equipo.
- Crear catalogo Modulo persistido y reemplazar lista hardcoded en servicio de informes.

Prioridad 2:

- Reemplazar body:any de hallazgos por DTOs (create/update) con class-validator.
- Agregar constraints en BD: UNIQUE(id_equipo) y FKs faltantes en hallazgos/mantenimiento.

Prioridad 3:

- Implementar bitacora de cambios de estado de hallazgos (tabla historial).
- Homogeneizar DTOs de salida para evitar respuestas dinamicas sin contrato.

## 15. Definicion de terminado (DoD) de implementacion SPEC4

SPEC4 estara implementado al 100% cuando:

- Todas las filas marcadas como Pendiente pasen a Implementado.
- Ninguna fila quede en Parcial por ausencia de constraints o auditoria.
- Existan pruebas de regresion para:
	- transiciones de estado,
	- validacion de modulos,
	- bloqueo por dia habil,
	- no alteracion de hallazgos al generar informes.
