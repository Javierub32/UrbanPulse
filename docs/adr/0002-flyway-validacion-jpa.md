# ADR 0002: Gestión del esquema con Flyway y validación con JPA

## Estado

Accepted.

## Contexto

La base de datos debe evolucionar junto con las entidades. El equipo necesita aplicar cambios de forma ordenada en los distintos entornos y detectar diferencias entre el esquema y el modelo de persistencia.

## Opciones consideradas

1. Gestionar los cambios con Flyway y validar el esquema con Hibernate.
2. Permitir que Hibernate cree o actualice automáticamente el esquema.
3. Aplicar los cambios SQL manualmente en cada entorno.

## Decisión

Gestionar el esquema mediante migraciones versionadas de Flyway y configurar Hibernate con `spring.jpa.hibernate.ddl-auto=validate`. Flyway aplica las migraciones pendientes; la validación comprueba la compatibilidad del esquema existente con las entidades, sin modificarlo.

## Consecuencias

- Los cambios quedan registrados y pueden aplicarse en orden.
- La validación permite detectar ciertas diferencias al arrancar.
- Cada cambio del esquema requiere preparar y revisar una migración.
- La validación no sustituye las pruebas de las migraciones ni garantiza por sí sola que los datos o todas las restricciones sean correctos.
