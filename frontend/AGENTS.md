# Frontend de UrbanPulse

Expo 57, React Native, TypeScript y Expo Router. Prioriza móvil y compatibilidad entre plataformas.

- Las pantallas y layouts viven en `src/app/`; componentes y hooks reutilizables van fuera.
- Para cambios que dependan de una API de Expo, EAS o React Native, consulta la documentación de la versión instalada en `package.json`.
- Si cambias llamadas al backend, comprueba rutas, DTO, validación y estados reales de la API.
- Antes de instalar paquetes, determina qué gestor y lockfile usa el equipo: existen `package-lock.json` y `pnpm-lock.yaml`. Usa `expo install` para elegir versiones compatibles con el SDK y el gestor activo.
- Si no existen `ios/` y `android/`, configura capacidades nativas mediante `app.json` o config plugins.
- Verificación desde `frontend/`: `npm run lint` y `npx tsc --noEmit`; ejecuta tests si el proyecto incorpora un script. Actualmente `package.json` no define ninguno.