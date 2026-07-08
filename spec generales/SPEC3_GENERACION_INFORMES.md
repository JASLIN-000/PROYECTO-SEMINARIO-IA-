# Spec 3: Generación automática de informes de mantenimiento

## 1. Objetivo
Permitir al técnico generar un informe de mantenimiento a partir de plantillas por módulo, editarlo y guardarlo para su posterior consulta o exportación.

## 2. Alcance del módulo
Este módulo cubre:
- Selección de uno a tres módulos por mantenimiento.
- Carga automática de plantillas de observación por módulo.
- Generación del informe con estructura en párrafos.
- Inclusión de hallazgos abiertos, pendientes y solucionados cuando corresponda.
- Edición y guardado del informe final.

## 3. Actores
- Técnico de mantenimiento.
- Administrador del sistema para definir plantillas.

## 4. Historia de usuario
Como técnico de mantenimiento, quiero generar automáticamente un informe a partir de plantillas por módulo, pudiendo editar el texto antes de guardarlo, para reducir el tiempo de redacción y registrar con precisión lo realizado en la intervención.

## 5. Requisitos funcionales
- RF-01: El sistema debe permitir seleccionar entre 1 y 3 módulos por mantenimiento.
- RF-02: El sistema debe cargar la plantilla asociada a cada módulo cuando exista.
- RF-03: El sistema debe generar un informe con una sección inicial de texto predeterminado editable.
- RF-04: El sistema debe incluir una sección de hallazgos en el informe.
- RF-05: El sistema debe mostrar subsecciones de hallazgos abiertos, pendientes y solucionados cuando existan registros aplicables.
- RF-06: El sistema debe permitir al técnico editar por completo el texto generado antes de guardar.
- RF-07: El sistema debe guardar el informe final como texto en la base de datos.
- RF-08: Si no existe plantilla para un módulo, el sistema debe permitir redactar manualmente el contenido.

## 6. Requisitos no funcionales
- RNF-01: La generación del informe no debe superar 5 segundos en condiciones normales.
- RNF-02: El informe debe guardarse de manera consistente y sin pérdida de contenido.
- RNF-03: La interfaz debe permitir editar el texto con facilidad.

## 7. Reglas de negocio
- Un módulo puede tener una plantilla asociada u otra no asociada.
- El informe debe incluir hallazgos del mantenimiento actual y los hallazgos de los últimos cinco meses cuando aplique.
- Si un mantenimiento no tiene hallazgos asociados, esa sección no se mostrará.
- Si el técnico selecciona más de tres módulos, la acción debe bloquearse.
- El texto predeterminado puede modificarse antes de guardar.

## 8. Flujo principal
1. El técnico selecciona el equipo y los módulos del mantenimiento.
2. El sistema carga la plantilla de cada módulo o habilita redacción manual.
3. El sistema arma el contenido inicial del informe.
4. El técnico revisa y edita el texto.
5. El sistema guarda el informe final asociado al mantenimiento.

## 9. Criterios de aceptación
- Se pueden elegir entre 1 y 3 módulos sin excepciones.
- El informe generado tiene una estructura clara y legible.
- El técnico puede modificar el texto completo antes de guardar.
- El informe queda persistido y disponible para consulta posterior.
