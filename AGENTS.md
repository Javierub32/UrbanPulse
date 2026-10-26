# UrbanPulse

Monorepo: `backend/` (Java 17, Spring Boot) y `frontend/` (Expo/React Native).

- Para una tarea que afecte a `backend/`, consulta `backend/AGENTS.md`; para `frontend/`, consulta `frontend/AGENTS.md`. Si afecta a ambos, consulta ambos y comprueba el contrato API ↔ app.
- Para explorar estructura o dependencias usa `codebase-memory`. Comprueba el estado y la cobertura del índice; indexa UrbanPulse solo si falta o está obsoleto y el grafo aporta a la tarea. Si hay huecos, lee el código fuente.
- Conserva los cambios ajenos a la tarea.

Skills: usa `.agents/skills/preparar-pr/SKILL.md` para el flujo completo de tests, push y PR. Para crear tests, corregir un bug o añadir una funcionalidad del backend, consulta respectivamente `backend/.agents/skills/crear-tests/SKILL.md`, `backend/.agents/skills/solucionar-bug/SKILL.md` o `backend/.agents/skills/desarrollar-feat/SKILL.md`.