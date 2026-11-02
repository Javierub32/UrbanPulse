---
name: crear-tests
description: Crea tests Java para un comportamiento concreto del backend de UrbanPulse, por petición directa o como parte de una feature, bug o PR.
---

# Tests del backend

1. Comprueba si ya existen tests que cubran el comportamiento pedido. Si existen, añade los casos que falten; si no existen, crea un test nuevo en el paquete correspondiente.

2. Cubre el comportamiento pedido con el nivel de prueba que detecte su fallo: JUnit/Mockito para lógica aislada, prueba HTTP para el contrato de controller, y Testcontainers con PostgreSQL/PostGIS para JPQL, Flyway o mapeos que dependan del motor real. Reutiliza la configuración de `backend/src/test/java` y mantén el paquete correspondiente.

3. Incluye el caso principal y los límites o errores relevantes. Ejecuta todos los tests. Informa de fallos o dependencias del entorno.
