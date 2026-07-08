# Spec 1: Gestión de hallazgos

## 1. Objetivo
Permitir al técnico de mantenimiento consultar, registrar y actualizar hallazgos asociados a los equipos, manteniendo trazabilidad histórica y evitando duplicidades.

## 2. Alcance del módulo
Este módulo cubre:
- Consulta de hallazgos de los últimos cinco meses.
- Visualización de hallazgos abiertos, pendientes y solucionados.
- Creación de nuevos hallazgos cuando el problema es diferente.
- Actualización de estado entre Pendiente y Solucionado.
- Asociación del hallazgo a un equipo, un mantenimiento y un módulo.

## 3. Actores
- Técnico de mantenimiento.
- Administrador del sistema (opcional para configuración inicial).

## 4. Historia de usuario
Como técnico de mantenimiento, quiero consultar los hallazgos abiertos, pendientes y solucionados de los últimos cinco meses, actualizar su estado y crear nuevos hallazgos cuando el problema sea diferente, para mantener trazabilidad y reducir duplicidad de registros.

## 5. Requisitos funcionales
- RF-01: El sistema debe mostrar los hallazgos de los últimos cinco meses por defecto.
- RF-02: El sistema debe permitir filtrar hallazgos por equipo, estado y módulo.
- RF-03: El sistema debe permitir cambiar el estado de un hallazgo a Pendiente o Solucionado.
- RF-04: El sistema debe permitir crear un nuevo hallazgo si el técnico considera que el problema es diferente.
- RF-05: El sistema debe guardar la fecha de solución cuando un hallazgo se marca como solucionado.
- RF-06: El sistema debe permitir registrar si un hallazgo requiere cotización.
- RF-07: El sistema debe asociar cada hallazgo a un equipo y a un mantenimiento.
- RF-08: El sistema debe permitir registrar observaciones adicionales del técnico.

## 6. Requisitos no funcionales
- RNF-01: La consulta de hallazgos debe responder en menos de 3 segundos.
- RNF-02: Los datos mostrados deben coincidir con los almacenados en la base de datos.
- RNF-03: Cada hallazgo debe tener un identificador único.
- RNF-04: Solo usuarios autorizados podrán modificar hallazgos.

## 7. Reglas de negocio
- Un hallazgo debe estar asociado a un equipo existente.
- El estado de un hallazgo solo puede ser Abierto, Pendiente o Solucionado.
- Si un hallazgo estaba Pendiente y luego se resuelve en el mismo mantenimiento, debe registrarse como Solucionado.
- Un hallazgo abierto implica que se encontró un problema que requiere cotización.
- Un hallazgo pendiente implica que el problema sigue activo o que el cambio aún no se ha realizado.
- El sistema conserva el historial completo de hallazgos, incluso cuando ya están solucionados.

## 8. Flujo principal
1. El técnico selecciona un equipo.
2. El sistema carga los hallazgos relacionados de los últimos cinco meses.
3. El técnico revisa el estado actual.
4. Si el hallazgo ya existe, actualiza su estado u observación.
5. Si el problema es nuevo, crea un nuevo hallazgo.
6. El sistema guarda el cambio y muestra el historial actualizado.

## 9. Criterios de aceptación
- El técnico puede ver hallazgos recientes sin navegar a otras pantallas.
- La actualización de estado se refleja inmediatamente en la vista.
- No se crean registros duplicados para el mismo problema sin intención del técnico.
- El historial conserva los cambios y fechas de solución.

## 10. Casos límite
- No existen hallazgos para el equipo seleccionado.
- El técnico intenta guardar un hallazgo sin completar los campos obligatorios.
- El hallazgo ya estaba registrado y se intenta actualizar desde una nueva intervención.
