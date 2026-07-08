# Spec 4: Modelo de datos y reglas transversales

## 1. Objetivo
Definir la estructura de datos del MVP y las reglas esenciales para garantizar consistencia, trazabilidad y generación correcta de informes.

## 2. Entidades principales

### 2.1 Equipo
Atributos:
- id_equipo (obligatorio, identificador único)
- nombre_equipo (obligatorio)
- acuerdo_nivel_servicio (obligatorio)
- estado (obligatorio)
- dia_habil (obligatorio para la programación del día)

### 2.2 Mantenimiento
Atributos:
- id_mantenimiento (obligatorio, identificador único)
- id_equipo (obligatorio)
- fecha_mantenimiento (obligatorio)
- tipo_mantenimiento (obligatorio)

### 2.3 Módulo
Atributos:
- id_modulo (obligatorio, identificador único)
- nombre_modulo (obligatorio)

### 2.4 Hallazgo
Atributos:
- id_hallazgo (generado por el sistema)
- id_equipo (obligatorio)
- id_mantenimiento (opcional, si aplica al mantenimiento actual)
- id_modulo (obligatorio)
- fecha_mantenimiento (obligatorio)
- tipo_mantenimiento (obligatorio)
- descripcion_hallazgo (obligatorio)
- cotizacion (obligatorio: Sí, No, N/A)
- requiere_cotizacion (obligatorio)
- observacion (opcional)
- estado (obligatorio: Abierto, Pendiente, Solucionado)
- fecha_solucion (opcional)

### 2.5 Informe
Atributos:
- id_informe (generado por el sistema)
- id_mantenimiento (obligatorio)
- observaciones (obligatorio)
- pendientes (opcional)
- recomendaciones (opcional)
- fecha_generacion (obligatorio)

### 2.6 Plantilla
Atributos:
- id_plantilla (generado por el sistema)
- id_modulo (obligatorio)
- plantilla_observacion (obligatorio)
- plantilla_recomendacion (opcional)

## 3. Relaciones
- Un equipo puede tener muchos mantenimientos.
- Un mantenimiento puede generar muchos hallazgos.
- Un mantenimiento genera un informe.
- Un módulo puede aparecer en muchos hallazgos.
- Un módulo puede tener una o varias plantillas asociadas.

## 4. Reglas transversales
- No deben existir duplicados de identificadores.
- Los datos visibles en pantalla deben coincidir con los almacenados en PostgreSQL.
- El sistema debe conservar el historial completo de hallazgos.
- Los cambios de estado deben registrarse de forma consistente.
- El informe debe generarse usando los datos del mantenimiento y los hallazgos asociados.

## 5. Consideraciones de persistencia
- El informe debe guardarse como texto.
- Los hallazgos deben conservar su fecha y estado histórico.
- La generación del informe no debe alterar los hallazgos originales.
