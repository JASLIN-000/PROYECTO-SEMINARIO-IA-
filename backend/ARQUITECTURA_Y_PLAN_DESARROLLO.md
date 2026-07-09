# Plan de desarrollo backend: arquitectura, API-First y buenas prácticas

## Objetivo

Construir un backend sólido, escalable y preparado para que el frontend lo consuma de forma directa, sin necesidad de modificar el código del backend en el futuro.

Este plan se basa en tres pilares:
- API-First
- Clean Architecture / Arquitectura Hexagonal
- Buenas prácticas de desarrollo backend con NestJS

---

## 1. Definir el contrato de la API antes de implementar la lógica

### Qué hacer
- Definir los endpoints principales del sistema antes de escribir la lógica de negocio.
- Documentar para cada endpoint:
  - método HTTP
  - ruta
  - parámetros
  - body de entrada
  - body de salida
  - códigos de respuesta
  - ejemplos reales

### Ejemplos de endpoints iniciales
- GET /v1/equipos
- GET /v1/equipos?q=compresor
- GET /v1/hallazgos?equipoId=1
- POST /v1/hallazgos
- PATCH /v1/hallazgos/:id
- GET /v1/plantillas?modulo=electrico
- GET /v1/informes
- POST /v1/informes

### Por qué es importante
- Evita cambios improvisados durante el desarrollo.
- Permite que el frontend conozca exactamente qué esperar.
- Facilita la documentación y el mantenimiento.

### Herramientas y patrones
- OpenAPI / Swagger
- DTOs claros y versionados
- Versionado de API con /v1

---

## 2. Separar claramente las capas del sistema

### Qué hacer
Organizar la aplicación en capas bien diferenciadas:
- capa de dominio
- capa de aplicación
- capa de infraestructura

### Estructura recomendada
- domain/
  - entities/
  - repositories/
  - value-objects/
- application/
  - use-cases/
  - services/
- infrastructure/
  - controllers/
  - repositories/
  - database/
  - auth/
- shared/
  - dto/
  - exceptions/
  - utils/

### Por qué es importante
- Evita mezclar reglas de negocio con detalles técnicos.
- Hace más fácil probar y extender el sistema.
- Reduce el riesgo de romper el backend al cambiar tecnología.

### Patrones recomendados
- Clean Architecture
- Hexagonal Architecture
- Inversión de dependencias

---

## 3. Diseñar el modelo de dominio del negocio

### Qué hacer
Representar las entidades reales del problema, no solo tablas de base de datos.

### Entidades clave
- Equipo
- Mantenimiento
- Hallazgo
- Informe
- Plantilla

### Reglas de negocio a modelar
- Un hallazgo pertenece a un equipo.
- Un informe se genera a partir de un mantenimiento.
- Un hallazgo puede cambiar de estado entre Pendiente y Solucionado.
- Un módulo puede tener o no una plantilla asociada.

### Por qué es importante
- El sistema refleja el negocio y no solo un conjunto de tablas.
- Facilita la evolución del producto.
- Evita que la lógica se disperse en múltiples archivos.

### Herramientas y patrones
- Entidades de dominio
- Reglas encapsuladas en clases
- Mapeo entre dominio y persistencia

---

## 4. Implementar DTOs y mapeadores desde el inicio

### Qué hacer
Definir DTOs explícitos para cada operación:
- DTO de entrada para crear hallazgos
- DTO de salida para devolver información al frontend
- DTO para filtros y búsquedas
- DTO para crear informes

### Ejemplos
- CreateHallazgoDto
- UpdateHallazgoDto
- CreateInformeDto
- GetEquiposQueryDto

### Por qué es importante
- El backend expone una interfaz limpia y estable.
- Se evita exponer internamente detalles de la base de datos.
- El frontend obtiene datos con estructura predecible.

### Herramientas y patrones
- class-validator
- class-transformer
- mapeadores entre entidad y DTO

---

## 5. Preparar la persistencia a través de repositorios

### Qué hacer
Separar el acceso a datos mediante repositorios:
- EquipoRepository
- HallazgoRepository
- InformeRepository
- PlantillaRepository

### Responsabilidades del repositorio
- crear registros
- leer registros
- filtrar
- actualizar
- eliminar si aplica

### Por qué es importante
- Aísla la lógica de negocio de la base de datos.
- Permite cambiar PostgreSQL por otra solución si fuera necesario.
- Hace el código más testeable.

### Herramientas y patrones
- Repository Pattern
- TypeORM o Prisma
- Migraciones
- Transacciones si son necesarias

---

## 6. Implementar casos de uso de aplicación

### Qué hacer
Crear casos de uso para cada tarea importante del negocio.

### Ejemplos de casos de uso
- ConsultarEquiposDelDiaUseCase
- CrearHallazgoUseCase
- ActualizarHallazgoUseCase
- GenerarInformeUseCase
- ConsultarPlantillasPorModuloUseCase

### Por qué es importante
- Los controladores no deben contener lógica de negocio.
- La lógica queda centralizada y reutilizable.
- Facilita pruebas unitarias.

### Patrones recomendados
- Use Cases
- Application Services
- Command / Query separation

---

## 7. Mantener los controladores como adaptadores de entrada

### Qué hacer
Los controladores deben encargarse de:
- recibir la petición HTTP
- validar entradas básicas
- invocar un caso de uso
- transformar la respuesta a un formato claro

### Por qué es importante
- Reduce la complejidad del controlador.
- Hace el backend más limpio y fácil de mantener.
- Permite cambiar el canal de entrada si luego se agrega otra interfaz.

### Herramientas y patrones
- NestJS Controllers
- Pipes
- Guards
- Filters
- Interceptors

---

## 8. Implementar validación, seguridad y manejo de errores desde el inicio

### Qué hacer
Desde el principio definir:
- validación de datos entrantes
- manejo centralizado de errores
- respuestas consistentes para el frontend
- autenticación y autorización básica

### Ejemplos de buenas prácticas
- 400 Bad Request para datos inválidos
- 404 Not Found para recursos inexistentes
- 409 Conflict para problemas de negocio
- 401/403 para accesos no autorizados

### Por qué es importante
- El frontend necesita respuestas claras y predecibles.
- La API se vuelve mucho más confiable.
- Se reducen errores inesperados en producción.

### Herramientas y patrones
- class-validator
- Guards
- Exception Filters
- Interceptors

---

## 9. Crear una estrategia de pruebas robusta

### Qué hacer
Definir pruebas desde el inicio:
- pruebas unitarias para casos de uso
- pruebas de integración para controladores y repositorios
- pruebas end-to-end para endpoints reales

### Qué probar
- crear hallazgo
- actualizar hallazgo
- consultar equipos del día
- generar informe
- consultar plantillas

### Por qué es importante
- Evita regresiones.
- Mejora la confianza al cambiar o extender la API.
- Permite modificar el código con menor riesgo.

### Herramientas recomendadas
- Jest
- Supertest
- Test doubles
- Arrange / Act / Assert

---

## 10. Preparar la API para consumo directo por el frontend

### Qué hacer
- dejar la API bien documentada
- mantener contratos estables
- usar respuestas estándar
- definir buenas prácticas de versionado
- preparar el backend para que el frontend lo consuma sin cambios internos

### Recomendación de formato de respuesta
```json
{
  "success": true,
  "data": {},
  "message": "Operación realizada correctamente"
}
```

### Por qué es importante
- El frontend puede consumir la API de forma directa.
- Se evita acoplamiento innecesario.
- Facilita la evolución futura del sistema.

### Herramientas y patrones
- Swagger / OpenAPI
- versionado de API
- contratos estables
- documentación automática

---

## Recomendación de orden de implementación

1. Definir el contrato API
2. Crear DTOs y entidades
3. Separar el dominio y casos de uso
4. Implementar repositorios
5. Conectar NestJS con PostgreSQL
6. Exponer endpoints estables
7. Añadir seguridad y manejo de errores
8. Crear pruebas
9. Documentar la API
10. Dejar preparado el backend para frontend

---

## Conclusión

Si sigues este enfoque, el backend quedará:
- bien estructurado
- fácil de mantener
- preparado para crecer
- listo para consumir desde Angular sin necesidad de modificar el backend por decisiones de frontend

Este es el camino correcto para pasar de un prototipo a un sistema robusto y profesional.
