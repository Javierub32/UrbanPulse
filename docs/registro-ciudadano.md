# Registro de ciudadanos

Para crear una cuenta solo hacen falta nombre, correo y contraseña. Una vez registrada, la persona puede volver al login y entrar con esos datos.

## Datos del registro

`POST /api/auth/register` es público y recibe exclusivamente:

```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "una-clave-de-ejemplo"
}
```

- Nombre obligatorio, máximo 100 caracteres; se eliminan espacios exteriores.
- Email obligatorio y válido, máximo 254 caracteres; se eliminan espacios exteriores y se conservan las mayúsculas. La comprobación de duplicados ignora mayúsculas.
- Contraseña obligatoria, al menos 8 caracteres Unicode y como máximo 72 bytes UTF-8 por BCrypt. No se recorta ni transforma; admite espacios, pero no puede contener solo espacios en blanco. Los acentos y emojis pueden ocupar varios bytes.
- Se rechazan campos adicionales, incluidos `role`, `active`, `id`, `passwordHash` y `createdAt`.
- El servidor asigna `CITIZEN`, `active=true`, fecha UTC y un hash BCrypt. No permite solicitar un rol de personal.

Respuesta `201 application/json`:

```json
{
  "id": "7213eebc-f0fe-4004-a1b8-a510872d460e",
  "name": "Ana García",
  "email": "ana@example.com",
  "role": "CITIZEN"
}
```

No devuelve contraseña ni hash y no inicia sesión. La pantalla comprueba también la confirmación de contraseña, vuelve al login y muestra la confirmación. El login devuelve el JWT y el usuario dentro de `user`.

El frontend hace una comprobación básica del correo; la validación final corresponde al backend, que puede devolver el error del campo. Se comprueban las longitudes Unicode y el límite de bytes sin cambiar la contraseña.

## Errores

`application/problem+json` con `status`, `title`, `detail`, `instance` y `code`:

| HTTP | `code` | Caso |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Campos ausentes, vacíos o fuera de límites. `errors` contiene `field`, `code` y `message`, sin el valor recibido. |
| 400 | `INVALID_REQUEST` | JSON ilegible, cuerpo nulo o campos adicionales. |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email existente, incluidas carreras entre registros simultáneos. |
| 500 | `INTERNAL_ERROR` | Error inesperado, sin detalles internos. |

El login conserva su error `401` con `{"message":"Credenciales inválidas"}`. La app admite ambos formatos y muestra los mensajes en español.

Se reutiliza el índice `uq_User_email_ignore_case` de V2. No hay migraciones nuevas ni cambios en las existentes. Solo una colisión en ese índice se convierte en `409`.

## Comprobar el registro

Con el backend configurado y arrancado:

```bash
curl -i http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana García","email":"ana@example.com","password":"una-clave-de-ejemplo"}'

curl -i http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"una-clave-de-ejemplo"}'
```

El primer registro devuelve `201`; repetirlo devuelve `409`. Añadir `role` con cualquiera de los cuatro roles privilegiados devuelve `400` sin crear la cuenta. La sesión, configuración del IDE, CORS y conexión de móvil están en [autenticacion-jwt.md](autenticacion-jwt.md).

## Cuentas de personal

Se habilita mediante el [procedimiento SQL interno](habilitar-personal.md), después de crear una cuenta ciudadana activa y verificar la identidad de su titular. No hay endpoint público para elevar roles ni se implementa la administración general de #10.

Los tokens duran por defecto 3 días (259200 segundos), sin renovación. El registro activa inmediatamente la cuenta, sin verificación de email. La verificación de correo o la recuperación de contraseña requerirían otro acuerdo.

El resto de permisos del personal se tratará en #10.
