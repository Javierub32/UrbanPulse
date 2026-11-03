# ADR 0001: PostgreSQL y PostGIS para los datos urbanos

## Estado

Accepted.

## Contexto

UrbanPulse necesita almacenar incidencias y activos urbanos con su ubicación, y trabajar con la proximidad entre ellos.

## Opciones consideradas

1. PostgreSQL con PostGIS.
2. PostgreSQL con coordenadas numéricas y cálculos geográficos en la aplicación.
3. Otra base de datos con soporte espacial.

## Decisión

Utilizar PostgreSQL como base de datos relacional y PostGIS para almacenar y consultar información geográfica. La elección responde a la necesidad de trabajar con ubicaciones y proximidad junto con los demás datos del dominio.

## Consecuencias

- Se dispone de tipos, operaciones e índices espaciales junto con las capacidades relacionales de PostgreSQL.
- El entorno necesita PostgreSQL con PostGIS; el equipo debe tener en cuenta los sistemas de coordenadas y las unidades de distancia.
- Cambiar de tecnología requeriría adaptar el esquema y las consultas que dependan de PostGIS.
