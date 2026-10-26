---
name: desarrollar-feat
description: Implementa una funcionalidad nueva del backend de UrbanPulse cuando se pida un contrato o comportamiento nuevo.
---

# Nueva funcionalidad del backend

1. Define el contrato observable y localiza el código relacionado. Implementa solo las capas necesarias conforme a `backend/AGENTS.md`; usa DTO en HTTP y `mapper` para las conversiones necesarias entre DTO y entidad. Si el esquema cambia, añade una migración Flyway y comprueba su coherencia con las entidades. Usa JPQL parametrizado para las consultas que no sean simples.

2. Añade pruebas del comportamiento nuevo siguiendo `../crear-tests/SKILL.md` y verifica las partes afectadas. Al terminar, resume contrato, decisiones relevantes, pruebas y cualquier límite conocido.
