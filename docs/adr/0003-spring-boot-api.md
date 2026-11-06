# ADR 0003: Spring Boot para la API

## Estado

Accepted.

## Contexto

UrbanPulse necesita una API que exponga las operaciones del sistema a las aplicaciones cliente y coordine la lógica de negocio y el acceso a los datos.

## Opciones consideradas

1. Desarrollar la API con Java y Spring Boot.
2. Utilizar otro framework para Java.
3. Utilizar un framework y lenguaje diferentes.

## Decisión

Utilizar Spring Boot para desarrollar la API. El backend actual emplea Java y dependencias de Spring para la API web, la validación y la persistencia.

## Consecuencias

- La API puede apoyarse en el ecosistema de Spring para organizar el desarrollo y conectar con otros componentes.
- El equipo debe conocer Java, Spring y la configuración de sus dependencias.
- Cambiar de framework implicaría adaptar parte del backend.
