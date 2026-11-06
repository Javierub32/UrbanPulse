# ADR 0005: Docker Compose para el entorno de desarrollo

## Estado

Accepted.

## Contexto

Para desarrollar y ejecutar el backend, el equipo necesita una base de datos PostgreSQL con PostGIS y una configuración de conexión común. También resulta útil poder ejecutar la API junto a la base de datos en contenedores.

## Opciones consideradas

1. Definir los servicios locales mediante Docker Compose.
2. Instalar y configurar PostgreSQL y PostGIS directamente en cada equipo.
3. Utilizar una base de datos remota para el desarrollo.

## Decisión

Utilizar Docker Compose para definir el entorno de desarrollo. El archivo del proyecto define una base de datos PostGIS y un servicio de API que puede activarse mediante el perfil `container`.

## Consecuencias

- El equipo dispone de una configuración compartida para levantar los servicios locales.
- Los volúmenes permiten conservar los datos de la base de datos entre ejecuciones.
- Este entorno requiere Docker y conocimientos básicos de contenedores.
- La configuración local debe mantenerse y no determina por sí sola cómo se desplegará la aplicación en la nube.
