# ADR 0006: Backend como monolito organizado por dominios

## Estado

Accepted.

## Contexto

La API debe reunir capacidades de identidad, gestión de incidencias, contexto urbano y otras áreas. El equipo necesita una organización que permita desarrollar estas capacidades y mantener clara su responsabilidad.

## Opciones consideradas

1. Una API monolítica organizada por áreas del dominio.
2. Servicios independientes desde el inicio.
3. Un único backend sin separación explícita por áreas.

## Decisión

Representar el backend actual como una única API Spring Boot organizada por componentes de dominio. Esta separación describe la arquitectura del proyecto y no implica que todos los componentes previstos estén implementados o sean desplegables de forma independiente.

## Consecuencias

- Una única API reduce el número de unidades de despliegue iniciales.
- La organización por dominios puede facilitar la localización y evolución de las responsabilidades.
- Los cambios y el despliegue de las distintas áreas siguen ligados a la misma aplicación.
- Es necesario cuidar los límites entre áreas para evitar dependencias que dificulten su mantenimiento o una posible separación futura.
