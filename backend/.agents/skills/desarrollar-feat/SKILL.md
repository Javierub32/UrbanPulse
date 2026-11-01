---
name: desarrollar-feat
description: Implementa una funcionalidad nueva del backend de UrbanPulse cuando se pida un contrato o comportamiento nuevo.
---

# Nueva funcionalidad del backend

1. Define el contrato observable y localiza el código relacionado. Implementa solo las capas necesarias conforme a `backend/AGENTS.md`; usa DTO en HTTP y `mapper` para las conversiones necesarias entre DTO y entidad. Si el esquema cambia, añade una migración Flyway y comprueba su coherencia con las entidades. Usa JPQL parametrizado para las consultas que no sean simples. Usa `@RequestMapping` en cada controlador y define la ruta de cada endpoint con `@GetMapping("/api/ruta")` o `@PostMapping("/api/ruta")`.
2. Implementa los DTO como clases Java con Lombok.
3. Usa la entidad JPA para representar y persistir el modelo de datos. No la expongas directamente en las respuestas HTTP.
4. Documenta en OpenAPI el contrato de cada endpoint: ruta, método, entrada, salida, códigos HTTP y errores aplicables. Reutiliza el manejo centralizado con `ProblemDetail`, códigos propios estables y mensajes seguros; incluye errores por campo para validaciones. Comprueba que documentación, respuestas reales y pruebas coincidan.
5. Añade pruebas del comportamiento nuevo siguiendo `../crear-tests/SKILL.md` y verifica las partes afectadas. Al terminar, resume contrato, decisiones relevantes, pruebas y cualquier límite conocido.
