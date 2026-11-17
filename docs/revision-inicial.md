# Revisión inicial de incidencias

La cola del operador contiene incidencias con estado `REPORTED`. Solo un operador autenticado puede consultar la cola o ejecutar acciones de revisión. El detalle se consulta mediante la API de incidencias existente.

- `GET /api/operator/reviews?page=0&size=20`: cola paginada, de la más antigua a la más reciente (máximo 100 por página).
- `POST /api/operator/reviews/{id}/edit`: actualiza `category`, `priority`, `latitude` y `longitude`. Si cambia la ubicación, se eliminan la dirección y las zonas anteriores para evitar incoherencias.
- `POST /api/operator/reviews/{id}/validate`: pasa a `VALIDATED`.
- `POST /api/operator/reviews/{id}/reject`: pasa a `REJECTED` y requiere `{ "reason": "..." }`.
- `POST /api/operator/reviews/{id}/request-information`: registra `{ "reason": "..." }` en el historial y conserva `REPORTED`.

La solicitud se puede ver en el historial de la incidencia, pero no se envía una notificación ni se implementa una respuesta del ciudadano. Esas funcionalidades están pendientes de definición.

Las operaciones se serializan por incidencia mediante un bloqueo de base de datos. Una incidencia que ya no esté en `REPORTED` devuelve 409. Los cambios de estado y las solicitudes guardan actor, fecha, estado anterior y posterior, y motivo si corresponde. La migración V6 permite que el historial previo a una asignación no tenga técnico asignado.
