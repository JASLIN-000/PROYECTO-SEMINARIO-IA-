# Guia completa: Excel -> PostgreSQL (DBeaver) -> Spring Boot JPA

Esta guia implementa un flujo seguro para importar tus tablas desde Excel y dejarlas listas para backend con relaciones, restricciones e integridad.

## 1) Diseño recomendado antes de importar

### Tabla equipos
Columnas finales:
- id (PK autogenerada)
- id_equipo (codigo del Excel, unico)
- nombre_equipo
- acuerdo_nivel_servicio_dh (entero: 1, 2, 3)
- estado (ACTIVO o INACTIVO)
- created_at, updated_at

Motivo:
- Las relaciones deben usar claves internas numericas (id) para estabilidad.
- El valor 1DH/2DH/3DH conviene guardarlo como entero para consultar y calcular.

### Tabla hallazgos
Columnas finales:
- id (PK)
- equipo_id (FK -> equipos.id)
- tipo_mantenimiento
- modulo
- descripcion_hallazgo
- cotizacion (SI/NO/NA)
- observacion
- estado (ABIERTO/PENDIENTE/SOLUCIONADO)
- fecha_hallazgo
- fecha_solucion
- created_at, updated_at

Motivo:
- Cada hallazgo queda asociado al equipo correcto por FK.
- Se evita texto libre sin control por constraints.

### Tabla plantillas
Columnas finales:
- id (PK)
- modulo (unico)
- observacion_estandar
- created_at, updated_at

Motivo:
- Permite reutilizar observaciones estandar por modulo.

## 2) Script SQL listo para ejecutar

Usa este archivo:
- [backend/sql/01_import_excel_mantenimiento.sql](../sql/01_import_excel_mantenimiento.sql)

El script incluye:
1. Funciones utilitarias (parseo SLA y fechas).
2. Tablas staging (todo texto).
3. Tablas finales con PK/FK/CHECK/indices.
4. Consultas de validacion de calidad.
5. Carga desde staging a final con transformaciones.
6. Consultas de verificacion final.

## 3) Importar Excel correctamente en DBeaver

### Paso A. Preparar archivos
1. En Excel, deja una hoja por tabla: equipos, hallazgos, plantillas.
2. Exporta cada hoja como CSV UTF-8.
3. Verifica columnas esperadas:

CSV equipos:
- id_equipo
- nombre_equipo
- acuerdo_nivel_servicio
- estado

CSV hallazgos:
- id_equipo
- tipo_mantenimiento
- modulo
- descripcion_hallazgo
- cotizacion
- observacion
- estado
- fecha_hallazgo
- fecha_solucion

CSV plantillas:
- modulo
- observacion_estandar

Nota: el campo id_equipo en hallazgos es obligatorio para relacionar con equipos.

### Paso B. Crear estructuras
1. Abre SQL Editor en DBeaver.
2. Ejecuta el script [backend/sql/01_import_excel_mantenimiento.sql](../sql/01_import_excel_mantenimiento.sql).
3. Esto crea tablas stg_equipos, stg_hallazgos y stg_plantillas.

### Paso C. Cargar CSV a staging
Para cada tabla staging:
1. Clic derecho tabla (ejemplo stg_equipos).
2. Import Data.
3. Formato: CSV.
4. Encoding: UTF-8.
5. Header: activado.
6. Delimiter: coma o punto y coma segun tu CSV.
7. Mapea columnas y ejecuta.

Repite para stg_hallazgos y stg_plantillas.

### Paso D. Validar datos en staging
En el script hay consultas de validacion comentadas.
1. Ejecuta cada consulta de validacion.
2. Si alguna devuelve filas, corrige datos en staging.
3. Cuando todo este correcto, ejecuta la seccion de carga a tablas finales.

## 4) Verificar que importo bien

Ejecuta verificaciones finales del script:
1. Conteo por tabla (equipos/plantillas/hallazgos).
2. Hallazgos huerfanos (debe ser 0).
3. Estados fuera de catalogo (debe ser 0).

Validaciones recomendadas adicionales:
- Unicidad de id_equipo.
- Valores de SLA coherentes (solo positivos).
- fecha_solucion >= fecha_hallazgo.

## 5) Integracion Spring Boot con JPA/Hibernate

## application.yml (base)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mantenimiento
    username: mantenimiento_app
    password: 12345
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

## Entidad Equipo

```java
package com.tuempresa.mantenimiento.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "equipos")
public class Equipo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "id_equipo", nullable = false, unique = true, length = 30)
  private String idEquipo;

  @Column(name = "nombre_equipo", nullable = false, length = 150)
  private String nombreEquipo;

  @Column(name = "acuerdo_nivel_servicio_dh", nullable = false)
  private Short acuerdoNivelServicioDh;

  @Enumerated(EnumType.STRING)
  @Column(name = "estado", nullable = false, length = 10)
  private EstadoEquipo estado;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @OneToMany(mappedBy = "equipo", fetch = FetchType.LAZY)
  private List<Hallazgo> hallazgos = new ArrayList<>();

  public enum EstadoEquipo {
    ACTIVO,
    INACTIVO
  }
}
```

## Entidad Hallazgo

```java
package com.tuempresa.mantenimiento.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hallazgos")
public class Hallazgo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "equipo_id", nullable = false)
  private Equipo equipo;

  @Column(name = "tipo_mantenimiento", nullable = false, length = 40)
  private String tipoMantenimiento;

  @Column(name = "modulo", nullable = false, length = 100)
  private String modulo;

  @Column(name = "descripcion_hallazgo", nullable = false, columnDefinition = "TEXT")
  private String descripcionHallazgo;

  @Enumerated(EnumType.STRING)
  @Column(name = "cotizacion", nullable = false, length = 5)
  private Cotizacion cotizacion;

  @Column(name = "observacion", columnDefinition = "TEXT")
  private String observacion;

  @Enumerated(EnumType.STRING)
  @Column(name = "estado", nullable = false, length = 12)
  private EstadoHallazgo estado;

  @Column(name = "fecha_hallazgo", nullable = false)
  private LocalDate fechaHallazgo;

  @Column(name = "fecha_solucion")
  private LocalDate fechaSolucion;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public enum Cotizacion {
    SI,
    NO,
    NA
  }

  public enum EstadoHallazgo {
    ABIERTO,
    PENDIENTE,
    SOLUCIONADO
  }
}
```

## Entidad Plantilla

```java
package com.tuempresa.mantenimiento.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plantillas")
public class Plantilla {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "modulo", nullable = false, unique = true, length = 100)
  private String modulo;

  @Column(name = "observacion_estandar", nullable = false, columnDefinition = "TEXT")
  private String observacionEstandar;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;
}
```

## Repositorios JPA

```java
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
  Optional<Equipo> findByIdEquipo(String idEquipo);
}

public interface HallazgoRepository extends JpaRepository<Hallazgo, Long> {
  List<Hallazgo> findByEquipoId(Long equipoId);
  List<Hallazgo> findByEstado(Hallazgo.EstadoHallazgo estado);
  List<Hallazgo> findByEquipoIdAndEstado(Long equipoId, Hallazgo.EstadoHallazgo estado);
}

public interface PlantillaRepository extends JpaRepository<Plantilla, Long> {
  Optional<Plantilla> findByModulo(String modulo);
}
```

## 6) Recomendaciones para evitar problemas futuros

1. Mantener staging permanente para cada nueva importacion de Excel.
2. No usar ddl-auto=update en produccion; usar migraciones (Flyway/Liquibase).
3. Agregar pruebas de integridad en CI/CD (conteos, FK, estados permitidos).
4. Auditar cambios con created_at/updated_at y logs de carga.
5. Definir catalogos controlados para estados y cotizacion.
