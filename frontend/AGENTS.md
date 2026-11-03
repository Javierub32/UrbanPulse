# Frontend de UrbanPulse

Expo 57, React Native, TypeScript y Expo Router. Prioriza móvil y compatibilidad entre plataformas.

- Para cambios que dependan de una API de Expo, EAS o React Native, consulta la documentación de la versión instalada en `package.json`.
- Si cambias llamadas al backend, comprueba rutas, DTO, validación y estados reales de la API.
- Antes de instalar paquetes, determina qué gestor y lockfile usa el equipo: existen `package-lock.json` y `pnpm-lock.yaml`. Usa `expo install` para elegir versiones compatibles con el SDK y el gestor activo.
- Verificación desde `frontend/`: `npm run lint` y `npx tsc --noEmit`; ejecuta tests si el proyecto incorpora un script. Actualmente `package.json` no define ninguno.
- Para implementar una nueva funcionalidad del frontend, consulta y aplica
  `frontend/.agents/skills/desarrollar-feat/SKILL.md`.
- Las rutas y layouts de Expo Router viven en `src/app/`. Los archivos
  específicos de una página viven en `src/pages/<nombre-pagina>/`.
  Los componentes y hooks compartidos entre páginas permanecen en las
  carpetas compartidas existentes.