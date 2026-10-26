---
name: solucionar-bug
description: Diagnostica y corrige un bug reproducible del backend de UrbanPulse; añade cobertura de regresión cuando sea viable.
---

# Corregir un bug del backend

1. Acota el fallo con el síntoma y el código afectado. Usa `codebase-memory` si necesitas relaciones entre componentes. Añade una prueba de regresión que reproduzca el fallo cuando sea viable; para escoger el nivel, lee `../crear-tests/SKILL.md`.

2. Corrige la causa en la capa responsable conforme a `backend/AGENTS.md`, sin introducir abstracciones que el bug no requiera, de la forma más sencilla posible. Ejecuta la regresión y las comprobaciones pertinentes. Entrega causa, corrección, pruebas y límites de la verificación.
