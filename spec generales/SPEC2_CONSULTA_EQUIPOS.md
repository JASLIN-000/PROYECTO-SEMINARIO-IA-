# Spec 2: Consulta de equipos programados y búsqueda

## 1. Objetivo
Permitir al técnico de mantenimiento visualizar automáticamente los equipos programados para el día hábil actual y buscarlos por ID o nombre con rapidez.

## 2. Alcance del módulo
Este módulo cubre:
- Consulta automática de equipos del día hábil actual.
- Búsqueda por ID o nombre del equipo.
- Visualización de información básica del equipo para iniciar la intervención.
- Acceso al historial de hallazgos del equipo seleccionado.

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

## 10. Fuera de alcance
- Filtros avanzados por ubicación o prioridad.
- Programación de equipos desde la interfaz.
