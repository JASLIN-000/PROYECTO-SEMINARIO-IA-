# PLANTEAMIENTO MVP FINAL

PLANTEAMIENTO MVP FINAL Sistema de Gestión de Hallazgos y Generación
Automática de Informes de Mantenimiento

Idea central La aplicación permitirá al técnico de mantenimiento
consultar automáticamente los equipos programados para el día hábil,
revisar los hallazgos históricos de los últimos cinco meses, actualizar
su estado como Pendiente o Solucionado, y generar un informe de
mantenimiento mediante plantillas por módulo, guardando dicho informe
como texto para su posterior consulta o exportación.

Ya existe una plantilla en Excel con 3 hojas y estructura real para el MVP:

 Equipos: ID Equipo, Nombre del Equipo, Acuerdo Nivel Servicio (DH) y Estado.\
 Hallazgos: ID Equipo, ID Hallazgo, Fecha Mantenimiento, Tipo Mantenimiento, Módulo, Descripción del Hallazgo, Cotización, Observación, Estado y Fecha Solución.\
 Plantillas: Módulo y Plantilla Observaciones.

Esta plantilla ya contiene ejemplos de equipos, módulos y textos base de observación, por lo que se usará como referencia para definir la carga inicial de datos y la generación automática del informe.

La base tecnológica ya fue definida:

 DBeaver como herramienta de administración.\
 PostgreSQL como base de datos.

2.  Bitácora del problema Problema identificado Actualmente, el técnico
    debe consultar varias fuentes para elaborar un informe: informes
    anteriores,\
      apuntes manuales,\
     chats de WhatsApp,\
     historial de reparaciones,\
     consulta directa al ingeniero.

Eso hace que el proceso tarde aproximadamente:

 25 minutos buscando información,\
 5 minutos redactando el informe.

Consecuencias  pérdida de tiempo,\
 dependencia de terceros,\
  poca trazabilidad,\
 dificultad para saber qué sigue pendiente.

riesgo de duplicar hallazgos,

Necesidad real Centralizar la información en una sola aplicación para:

 consultar los equipos del día,\
revisar los hallazgos abiertos,\


registrar nuevos hallazgos,

  generar el informe final sin rehacer todo manualmente.

Viabilidad temporal Sí es viable para un MVP, porque el alcance quedó
delimitado en tres funciones principales:

1.  consultar equipos programados,\

2.  revisar y actualizar hallazgos,\

3.  generar y guardar el informe.

4.  Historias de usuario del MVP HU-01: Consulta de equipos programados
    Como técnico de mantenimiento, quiero visualizar automáticamente los
    equipos programados para el día hábil actual y buscarlos por ID o
    por nombre del equipo, para iniciar rápidamente la intervención sin
    buscar manualmente qué equipos debo atender. HU-02: Gestión de
    hallazgos Como técnico de mantenimiento, quiero consultar los
    hallazgos abiertos, pendientes y solucionados de los últimos cinco
    meses, actualizar su estado como Pendiente o Solucionado, y crear
    un nuevo hallazgo si el problema es diferente, para mantener la
    trazabilidad del historial y evitar duplicidad de registros. El
    técnico evaluará si el hallazgo actual corresponde a uno ya
    registrado en el historial; si lo considera el mismo, lo actualizará;
    si lo considera diferente, generará un hallazgo nuevo. HU-03:
    Generación de informe Como técnico de mantenimiento, quiero generar
    automáticamente el informe de mantenimiento a partir de plantillas
    por módulo, pudiendo editar el texto antes de guardarlo, para
    reducir el tiempo de redacción y registrar con precisión lo realizado
    en la intervención. El informe debe estructurarse en párrafos y
    contener una sección de texto predeterminado por módulo, una
    sección de hallazgos y, cuando aplique, las subsecciones de
    hallazgos abiertos, pendientes y solucionados. Si no existe una
    plantilla para un módulo, el técnico podrá redactar el contenido
    manualmente. El técnico podrá editar por completo el texto
    predeterminado antes de guardar el informe.

5.  MoSCoW Must

 Mostrar automáticamente los equipos del día hábil actual.\
 Buscar equipos por ID o nombre.\
 Consultar hallazgos de los últimos cinco meses.\
 Actualizar hallazgos como Pendiente o Solucionado.\
 Generar informe automático editable.\
 Guardar el informe final.\
 Permitir hasta 3 módulos por mantenimiento.

Should

 Ver historial completo de hallazgos antiguos.\


Identificar visualmente hallazgos persistentes.

 Ordenar hallazgos por antigüedad o estado.

Could

 Gráficas de hallazgos por módulo.\
Indicadores de frecuencia por equipo.\
  Vista resumen con tarjetas y colores.



Won't Integración con WhatsApp.\
Integración con Salesforce.

  Gestión de repuestos.\
 Gestión de cotizaciones.\
 App móvil.\


IA para redactar informes.

7.  Requisitos funcionales RF-01 El sistema debe mostrar automáticamente
    los equipos programados para el día hábil actual. RF-02 El sistema
    debe permitir buscar equipos por ID o por nombre del equipo. RF-03
    El sistema debe consultar los hallazgos abiertos, pendientes y
    solucionados de los últimos cinco meses. RF-04 El sistema debe
    permitir actualizar un hallazgo como Pendiente o Solucionado. RF-05
    El sistema debe permitir crear un nuevo hallazgo si el técnico
    considera que el problema es diferente. RF-06 El sistema debe
    generar automáticamente el informe de mantenimiento mediante
    plantillas por módulo, con una estructura en párrafos, una sección
    de texto predeterminado editable y subsecciones de hallazgos
    abiertos, pendientes y solucionados cuando correspondan. RF-07 El
    sistema debe permitir seleccionar entre 1 y 3 módulos por
    mantenimiento. RF-08 El sistema debe permitir editar el informe
    antes de guardarlo. RF-09 El sistema debe guardar el informe final
    como texto en la base de datos.

8.  Requisitos no funcionales RNF-01 Rendimiento La consulta de equipos
    y hallazgos debe responder en menos de 3 segundos. RNF-02 Generación
    de informe

La construcción del informe no debe superar 5 segundos en condiciones
normales. RNF-03 Integridad de datos Cada hallazgo debe tener un único
registro y no deben existir duplicados de identificadores. RNF-04
Usabilidad La pantalla principal debe permitir acceder a los equipos del
día y a la búsqueda sin más de 3 acciones. RNF-05 Consistencia Los datos
visibles en pantalla deben coincidir con lo almacenado en PostgreSQL.
RNF-06 Seguridad básica Solo usuarios autorizados deben poder modificar
hallazgos y guardar informes.

9.  Variables de acción, condicionales y flujo Variables de entrada
    id_equipo



  nombre_equipo\
 dia_habil\
 estado_equipo\
id_hallazgo\
 fecha_mantenimiento\
id_modulo

  descripcion_hallazgo\
 cotizacion\
 observacion\
 estado\


fecha_solucion\
texto_plantilla\
Variables de acción



 consultar\
 buscar\
 seleccionar\
 visualizar\
 actualizar\
 crear\
 editar\
 generar\
 guardar

Condicionales

 Si el día hábil actual coincide con la programación, mostrar los
equipos del
día.

 Si el técnico busca por ID o nombre, filtrar resultados.

 Si un hallazgo está abierto, incluirlo como hallazgo que requiere
cotización.

 Si un hallazgo está pendiente, incluirlo en la vista principal y en
la sección correspondiente del informe cuando aplique.

 Si un hallazgo está solucionado, mantenerlo en historial y, si se
resolvió en el mismo mantenimiento, registrarlo en la sección de
solucionados del informe.

 Si el técnico considera que es un problema diferente, crear un nuevo
hallazgo; si considera que es el mismo, actualizar el hallazgo
registrado.

 Si no existe plantilla para un módulo, el sistema debe permitir la
redacción manual del contenido.

 Si selecciona más de 3 módulos, el sistema debe bloquear la acción.

 Si el informe tiene texto generado, el técnico puede editarlo por
completo antes de guardar.

Estructura Entrada → Proceso → Salida Entrada

 programación del día,\
 datos del equipo,\
 hallazgos previos,\
 módulos seleccionados,\
 observaciones del técnico.

Proceso

 calcular día hábil,\
 buscar equipos programados,\
 cargar hallazgos de los últimos 5 meses,\
 permitir actualización de estado,\
 generar texto por plantilla,\
 combinar módulos,\
 permitir edición,\
 guardar informe.

Salida lista de equipos del día,

  hallazgos filtrados,\
  historial actualizado.

informe final guardado,

10. Claves foráneas Tabla mantenimiento id_equipo → referencia a
    equipo.id_equipo\
    Tabla hallazgo id_equipo → referencia a equipo.id_equipo\
    id_mantenimiento → referencia a mantenimiento.id_mantenimiento\
    id_modulo → referencia a modulo.id_modulo\
    Tabla informe id_mantenimiento → referencia a
    mantenimiento.id_mantenimiento\
    Tabla plantilla id_modulo → referencia a modulo.id_modulo













11. Modelo de datos definitivo 11.1 equipo

Atributos id_equipo

  nombre_equipo\
 dia_habil\
 estado









11.2 mantenimiento Atributos id_mantenimiento\
id_equipo\
fecha_mantenimiento\
tipo_mantenimiento\
11.3 modulo Atributos id_modulo







  nombre_modulo\
11.4 hallazgo Atributos id_hallazgo\
id_equipo\
id_mantenimiento\
id_modulo\
fecha_mantenimiento\
tipo_mantenimiento\
descripcion_hallazgo\
cotizacion\
requiere_cotizacion\
observacion\
estado\
fecha_solucion\
11.5 informe Atributos id_informe\
id_mantenimiento

  observaciones\
  pendientes\


recomendaciones

fecha_generacion\
11.6 plantilla Atributos id_plantilla\
id_modulo



  plantilla_observacion\
 plantilla_recomendacion

12. ERD textual

EQUIPO 1 ──────\< MANTENIMIENTO 1 ──────\< HALLAZGO 1 ──────\< INFORME

MANTENIMIENTO 1 ──────\< HALLAZGO 1 ────── INFORME

MODULO 1 ──────\< HALLAZGO 1 ──────\< PLANTILLA Lectura del ERD

 Un equipo puede tener muchos mantenimientos.\
 Un mantenimiento puede generar muchos hallazgos.\
 Un mantenimiento genera un informe.\
 Un módulo puede aparecer en muchos hallazgos.\
 Un módulo tiene una plantilla asociada.

13. Reglas de negocio y criterios de generación de informe

- El sistema conserva todo el historial de hallazgos.
- La vista principal muestra los hallazgos abiertos y pendientes de los
  últimos 5 meses.
- El técnico puede consultar hallazgos más antiguos cuando lo requiera.
- El informe debe incluir hallazgos previos correspondientes a los
  últimos 5 meses, además de los hallazgos del mantenimiento actual.
- El informe debe estructurarse en párrafos y contener una sección
  inicial de texto predeterminado por módulo, una sección de hallazgos
  y, cuando aplique, las subsecciones de hallazgos abiertos, pendientes
  y solucionados.
- Un hallazgo abierto significa que se encontró un problema que requiere
  cotización.
- Un hallazgo pendiente significa que no requiere cotización y/o el
  elemento ya se encuentra en el edificio, pero aún no se ha realizado
  el cambio.
- Cerrar un hallazgo equivale a marcarlo como solucionado.
- Si un hallazgo estaba pendiente y luego se resuelve en el mismo
  mantenimiento, se registra en la sección de solucionados del informe.
- Si un mantenimiento no tiene hallazgos asociados, esa sección no
  aparece en el informe.
- Si no existe una plantilla para un módulo, el técnico podrá redactar
  el contenido manualmente.
- El texto predeterminado puede editarse por completo antes de guardar
  el informe.
- Un mantenimiento puede incluir hasta 3 módulos.
- El ID del hallazgo lo genera el sistema.
- El mismo hallazgo puede actualizarse o puede crearse uno nuevo si el
  técnico considera que es diferente.

GIT Y GITHUB

Antes de git, uno realiza varias versiones

14. Especificación funcional formal

14.1 Entidades del sistema

- Equipo
  - id_equipo (obligatorio)
  - nombre_equipo (obligatorio)
  - acuerdo_nivel_servicio (obligatorio)
  - estado (obligatorio)

- Hallazgo
  - id_hallazgo (generado por el sistema)
  - id_equipo (obligatorio)
  - fecha_mantenimiento (obligatorio)
  - tipo_mantenimiento (obligatorio)
  - modulo (obligatorio)
  - descripcion_hallazgo (obligatorio)
  - cotizacion (obligatorio: Sí, No, N/A)
  - observacion (opcional)
  - estado (obligatorio: Abierto, Pendiente, Solucionado)
  - fecha_solucion (opcional)

- Informe
  - id_informe (generado por el sistema)
  - id_mantenimiento o id_equipo (obligatorio)
  - fecha_mantenimiento (obligatorio)
  - modulo (obligatorio, hasta 3 módulos por mantenimiento)
  - texto_informe (obligatorio, guardado como texto)
  - fecha_generacion (obligatoria)

- Plantilla
  - modulo (obligatorio)
  - plantilla_observaciones (obligatoria)

14.2 Datos obligatorios para generar un informe

El informe debe contener obligatoriamente:

- fecha del mantenimiento
- módulo
- descripción del hallazgo
- cotización (Sí, No, N/A)
- estado
- texto del informe generado y guardado como texto

14.3 Reglas de negocio formalizadas

- El técnico deberá revisar el historial de hallazgos de los últimos 5 meses antes de decidir si un hallazgo es nuevo o ya existente.
- Si el hallazgo ya existe y corresponde al mismo problema, se actualizará el registro existente.
- Si el hallazgo es diferente, se generará un registro nuevo.
- Un hallazgo abierto significa que requiere cotización.
- Un hallazgo pendiente significa que no requiere cotización y/o el elemento ya está en el edificio pero aún no se ha realizado el cambio.
- Un hallazgo solucionado es aquel que ha sido cerrado.
- Si un hallazgo pendiente se resuelve en el mismo mantenimiento, debe registrarse en la sección de solucionados del informe.
- Si un mantenimiento no tiene hallazgos asociados, esa sección no debe aparecer en el informe.
- Si no existe una plantilla para un módulo, el técnico podrá redactar el contenido manualmente.
- El texto predeterminado puede editarse completamente antes de guardar el informe.
- El informe podrá incluir hallazgos previos de los últimos 5 meses y los hallazgos del mantenimiento actual.
- El informe debe generarse en párrafos y con estructura de secciones.

14.4 Flujo de uso del sistema

1. El técnico ingresa al sistema y visualiza los equipos programados para el día hábil.
2. Selecciona un equipo y revisa su historial de hallazgos de los últimos 5 meses.
3. Decide si el hallazgo actual es nuevo o ya existente.
4. Si es existente, actualiza el estado a Pendiente o Solucionado.
5. Si es nuevo, crea un hallazgo con sus datos correspondientes.
6. Selecciona uno o varios módulos para el mantenimiento, hasta un máximo de 3.
7. El sistema trae la plantilla de observaciones del módulo o permite redacción manual.
8. El técnico edita el texto generado.
9. El sistema genera el informe y lo guarda como texto.

14.5 Criterios de aceptación del MVP

- El sistema muestra correctamente los equipos programados para el día hábil.
- El sistema permite buscar equipos por ID o nombre.
- El sistema muestra hallazgos históricos de los últimos 5 meses.
- El sistema permite actualizar el estado de un hallazgo a Pendiente o Solucionado.
- El sistema permite crear un hallazgo nuevo cuando el técnico lo considera diferente.
- El sistema genera un informe con texto editable y lo guarda como texto.
- El sistema permite trabajar con hasta 3 módulos por mantenimiento.
- El sistema evita duplicados de hallazgos cuando el técnico considera que el problema es el mismo.


