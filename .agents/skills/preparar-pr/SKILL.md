---
name: preparar-pr
description: Cubre los cambios del backend de UrbanPulse con tests, ejecuta la suite Maven y publica una PR cuando el usuario pida el flujo completo de push y PR.
---

# Preparar PR de UrbanPulse

Actívala para publicar el diff actual como PR; una simple revisión o petición de tests usa otro flujo. La solicitud de este flujo incluye commit, push y PR del alcance pedido.

1. Determina rama base, remoto y alcance con `git status`, diff staged y unstaged y archivos nuevos. Incluye en el commit los cambios de la tarea; conserva los demás. Si estás en la rama base, crea una rama de trabajo antes de publicar.
2. Añade o amplía los tests del backend siguiendo `backend/.agents/skills/crear-tests/SKILL.md`.
3. Ejecuta la suite completa del backend desde `backend/`: `.\mvnw.cmd test` en Windows o `bash ./mvnw test` en Unix. Si falla la compilación o algún test del backend, detén la publicación e informa del bloqueo. No ejecutes tests, lint ni TypeScript del frontend, ni instales sus dependencias, salvo petición explícita del usuario. Los errores del frontend no bloquean la publicación de una PR del backend; si ya se conocen, indícalos como información sin modificar código ajeno para resolverlos.
4. Revisa el diff final y los archivos que vas a incluir. Crea el commit si es necesario, haz push al remoto correcto y abre la PR mediante el MCP de GitHub. Lee la plantilla vigente `.github/pull_request_template.md` y rellénala con resultados reales y **concisos**, la PR debería poder leerse en 1-2 minutos; elimina `Closes #` si no hay issue confirmado.

Entrega enlace de PR, resumen y resultados reales de cada comprobación. Si no puedes completar el push o la creación mediante MCP, informa del paso pendiente sin afirmar que existe la PR.
