# Investigación: OpenAPI y respuestas de error

Consulta: 31 de octubre de 2026. Esta nota describe opciones y evidencia; no cambia el contrato de la API.

## Situación de UrbanPulse

- `POST /api/incidents/create` valida `IncidentRequest` con `@Valid` y responde `201` con `IncidentResponse` cuando el servicio termina correctamente ([controlador](../backend/src/main/java/com/leftjoiner/urbanpulse/urbanpulse/controller/IncidentController.java), [solicitud](../backend/src/main/java/com/leftjoiner/urbanpulse/urbanpulse/dto/IncidentRequest.java)).
- La solicitud exige, entre otros campos, un UUID de usuario, título y descripción no vacíos, categoría y coordenadas dentro de sus límites. Un cuerpo inválido es un caso de error de entrada que conviene documentar como `400`, previa comprobación del cuerpo y tipo de contenido reales mediante una prueba HTTP. El servicio lanza `ResponseStatusException(404, "User not found")` si el usuario no existe ([servicio](../backend/src/main/java/com/leftjoiner/urbanpulse/urbanpulse/service/IncidentService.java)).
- No se ha encontrado un `@ControllerAdvice`, `@ExceptionHandler` o uso de `ProblemDetail` propio en `backend/src/main`; el `pom.xml` no declara springdoc. Por ello no debe asumirse que el cuerpo actual de los errores sea RFC 9457 ni que contenga el mensaje de la excepción. Hay que observarlo con la configuración efectiva ([configuración](../backend/src/main/resources/application.properties), [POM](../backend/pom.xml)).

## Qué debe expresar el contrato

OpenAPI permite describir cada respuesta por código, con una descripción obligatoria, cabeceras y `content` por tipo de medio; también permite `default` para respuestas no declaradas individualmente. La especificación recomienda cubrir la respuesta de éxito y los errores conocidos, sin exigir enumerar todos los códigos posibles ([OpenAPI 3.0.4, Responses y Response Object](https://spec.openapis.org/oas/v3.0.4.html#responses-object)).

Para cada operación, documentar el código, la condición que lo provoca, el tipo de medio y el esquema y ejemplo del cuerpo que realmente se devuelve. Si una respuesta no tiene cuerpo, no atribuirle un esquema. Para creación de incidencia, `201`, `400` y `404` son puntos de partida verificables; un UUID mal formado o JSON ilegible también debe contrastarse con pruebas. No inventar `401`, `403` o `409` sin una ruta real que los produzca.

## springdoc y anotaciones

Springdoc inspecciona la aplicación en ejecución y complementa la documentación inferida con anotaciones Swagger. Su matriz declara compatibles Spring Boot `4.1.x` y springdoc `3.1.x–3.2.x`; el POM actual usa Boot `4.1.1`. El starter `springdoc-openapi-starter-webmvc-ui` aporta Swagger UI y OpenAPI, mientras que `springdoc-openapi-starter-webmvc-api` sirve para la descripción sin UI. Los valores y rutas deben comprobarse en la versión elegida y la configuración efectiva ([springdoc: introducción, starters y compatibilidad](https://springdoc.org/)).

`@Operation` puede contener `@ApiResponse` para cada código; `@Content` define el tipo de medio y `@Schema(implementation = ...)` el modelo. Una respuesta sin contenido puede describirse con `content = @Content`. Estas anotaciones describen el contrato, no implementan el manejo de errores ([ejemplos oficiales de springdoc](https://springdoc.org/#how-can-i-return-an-empty-content-as-response)). Ejemplo ilustrativo **solo si** la aplicación realmente devuelve `ProblemDetail` para 404:

```java
@ApiResponse(responseCode = "404", description = "El usuario indicado no existe",
    content = @Content(mediaType = "application/problem+json",
        schema = @Schema(implementation = ProblemDetail.class)))
```

El JSON generado en `/v3/api-docs` debe contrastarse con respuestas HTTP reales; en particular, verificar los códigos, los tipos de medio, los esquemas y la ausencia de respuestas genéricas no aplicables. Springdoc puede incorporar respuestas de `@ControllerAdvice`, por lo que su alcance debe revisarse por operación ([propiedades de springdoc](https://springdoc.org/properties.html)).

## Problem Details: alternativa, no comportamiento supuesto

RFC 9457 define `application/problem+json` y miembros como `type`, `title`, `status`, `detail` e `instance`. Si se incluye `status`, debe coincidir con el estado HTTP emitido por el servidor; `detail` es texto para ayudar a corregir el problema y no debe utilizarse como campo estructurado que el cliente analice. Las extensiones permiten información específica y los clientes deben ignorar las que no reconozcan. Conviene evitar exponer detalles internos ([RFC 9457, secciones 3 y 5](https://www.rfc-editor.org/rfc/rfc9457.html#section-3)).

Spring MVC ofrece `ProblemDetail`, `ErrorResponse` y `ResponseEntityExceptionHandler`; al devolver un `ProblemDetail`, su estado determina el estado HTTP y, si falta `instance`, Spring usa la ruta de la solicitud. Las propiedades adicionales pueden serializarse como campos superiores. Un `@ControllerAdvice` basado en `ResponseEntityExceptionHandler` permite manejar excepciones MVC con este formato ([Spring Framework: Error Responses](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html)). Adoptarlo requiere implementar y verificar ese comportamiento; añadir anotaciones OpenAPI por sí solo no cambia las respuestas. Si se incorpora una lista estructurada de errores de validación, hay que definir explícitamente su esquema y probarlo.
