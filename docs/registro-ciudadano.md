# Registro ciudadano · entrega parcial de #9

## Contrato implementado

`POST /api/auth/register` es público y recibe exclusivamente:

```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "una-clave-de-ejemplo"
}
```

- Nombre obligatorio, máximo 100 caracteres; se eliminan espacios exteriores.
- Email obligatorio y válido, máximo 254 caracteres; se eliminan espacios exteriores y se conservan las mayúsculas. No se permiten dos cuentas con el mismo email aunque cambien las mayúsculas.
- Contraseña obligatoria, mínimo 8 caracteres Unicode y máximo 72 bytes UTF-8 por el límite de BCrypt. No se recorta ni transforma; admite espacios. Los caracteres acentuados y emojis pueden ocupar varios bytes.
- Se rechazan campos adicionales, incluidos `role`, `active`, `id`, `passwordHash` y `createdAt`.
- El servidor crea una cuenta `CITIZEN`, activa, con fecha UTC del servidor y contraseña almacenada exclusivamente como hash BCrypt.

Respuesta `201 application/json`:

```json
{
  "id": "7213eebc-f0fe-4004-a1b8-a510872d460e",
  "name": "Ana García",
  "email": "ana@example.com",
  "role": "CITIZEN"
}
```

El registro no inicia sesión. Después se utiliza el login existente, `POST /api/auth/login`; esta entrega todavía no añade JWT, renovación ni pantallas de la app.

## Errores

Los errores del registro usan `application/problem+json`, con `status`, `title`, `detail`, `instance` y un `code` estable:

| HTTP | `code` | Cuándo ocurre |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos ausentes, vacíos o fuera de sus límites. Incluye `errors` con `field`, `code` y `message`, sin devolver el valor introducido. |
| 400 | `INVALID_REQUEST` | JSON ilegible, cuerpo nulo o campos adicionales. |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email existente, también si dos registros simultáneos compiten por el mismo email. |
| 500 | `INTERNAL_ERROR` | Fallo inesperado, sin detalles internos en la respuesta. |

Las validaciones HTTP de autenticación reutilizan el mismo formato de errores que incidencias. El login conserva su respuesta de éxito y su `401` con `{"message":"Credenciales inválidas"}`.

Se reutiliza el índice `uq_User_email_ignore_case` de V2. No cambia el esquema ni ninguna migración existente. Una colisión en ese índice se traduce en `409`; otras incidencias de persistencia no se presentan como emails duplicados.

El contrato también está disponible en `/v3/api-docs` y en Swagger UI (`/swagger-ui.html`).

## Comprobación manual con el backend arrancado

```bash
curl -i http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana García","email":"ana@example.com","password":"una-clave-de-ejemplo"}'

curl -i http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"una-clave-de-ejemplo"}'
```

El primer registro devuelve `201`; repetirlo devuelve `409`. Añadir `"role":"ADMINISTRATOR"` al registro devuelve `400` y no crea la cuenta.

## Preguntas agrupadas para Javi antes de continuar con JWT

1. **Experiencia de sesión:** ¿el usuario debe volver a introducir su contraseña cuando caduque el token o debe poder mantener la sesión durante días? El segundo caso requiere renovación y cierre de sesión en el backend, además del JWT.
2. **Duración:** ¿qué duración quiere para el token y, si existe renovación, para la sesión completa? En el plan se propusieron 15 minutos para el token; todavía no se ha fijado ese valor.
3. **Cuentas de personal:** ¿quién podrá habilitarlas y qué procedimiento interno debe documentarse? El registro público solo crea ciudadanos.
4. **Revisión del registro:** se han implementado los límites anteriores y la activación inmediata de ciudadanos, sin verificación del correo. ¿Son las reglas que quiere el equipo?

Estas preguntas corresponden a acuerdos del equipo. Esta entrega cubre el registro y sus pruebas; #9 sigue abierto. El README se completará al final, según lo acordado.
