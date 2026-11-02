# Backend de UrbanPulse

Java 17, Spring Boot, JPA, Flyway, PostgreSQL/PostGIS, Lombok, JUnit 5 y Testcontainers. Paquete base: `com.leftjoiner.urbanpulse.urbanpulse`.

- `controller`: contrato HTTP y validación; delega la lógica en `service`.
- `dto`: entrada y salida de la API; no expongas entidades JPA.
- `service`: reglas de aplicación y transacciones; coordina `repository` y `mapper`.
- `repository`: Spring Data JPA; métodos derivados para consultas claras y JPQL parametrizado cuando la consulta de dominio lo requiera.
- `entity`: modelo persistente; respeta las migraciones Flyway, los identificadores SQL entrecomillados, enums y geometrías existentes.
- `mapper`: convierte explícitamente entre DTO y entidad fuera de controllers y repositorios. Implementa solo las direcciones de conversión usadas. Hereda de MapperDTO y implementa su toDTO(). Un mapper por cada DTO/entidad que necesite conversión.

En los beans Spring que requieran inyección (controllers, servicios o mappers), declara las dependencias `private final` y usa `@RequiredArgsConstructor`. Aplícalo a clases nuevas o editadas; no refactorices clases ajenas por esta convención. Las entidades JPA necesitan constructor sin argumentos.

El esquema se gestiona con Flyway y `ddl-auto=validate`. Para cambios de persistencia, consulta también la migración correspondiente. Pruebas en `backend/src/test/java`; usa Testcontainers/PostGIS para consultas y mapeos cuyo resultado dependa de la base real. Suite completa desde `backend/`: `.\mvnw.cmd test` en Windows o `./mvnw test` en Unix.
