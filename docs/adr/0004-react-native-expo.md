# ADR 0004: React Native y Expo para el frontend

## Estado

Accepted.

## Contexto

UrbanPulse necesita una aplicación desde la que los ciudadanos puedan consultar y comunicar incidencias. El proyecto requiere una interfaz móvil y el frontend dispone también de soporte web.

## Opciones consideradas

1. React Native con Expo.
2. Aplicaciones móviles nativas separadas para cada plataforma.
3. Otro framework multiplataforma.

## Decisión

Utilizar React Native y Expo para desarrollar el frontend. La aplicación utiliza Expo Router y dependencias de React Native, además de soporte web mediante React Native Web.

## Consecuencias

- El equipo puede compartir parte del código de interfaz entre plataformas.
- Las diferencias entre móvil y web pueden requerir componentes o ajustes específicos.
- Es necesario comprobar la compatibilidad de las bibliotecas nativas con las versiones de Expo y las plataformas utilizadas.
- El frontend depende de React Native, Expo y su ecosistema de herramientas.
