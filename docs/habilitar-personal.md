# Habilitar una cuenta de personal

Las cuentas que se crean desde la app son de ciudadanos. Si alguien del equipo necesita una cuenta de personal, primero debe registrarse y después una persona autorizada puede cambiar su rol con `backend/scripts/habilitar-personal.sql`. El script se ejecuta directamente contra PostgreSQL.

## Antes de empezar

1. Registrar la cuenta por el flujo normal y comprobar que puede iniciar sesión.
2. El responsable del proyecto verifica quién es su titular y qué función le corresponde. Confirmar el UUID exacto, no solo el nombre visible.
3. La cuenta debe existir y estar activa. El script no la crea, no la reactiva y no cambia su contraseña.
4. Ejecutar únicamente por una persona autorizada a administrar cuentas. No distribuir credenciales de PostgreSQL a los usuarios de la app.

La conexión necesita `CONNECT` a la base, `USAGE` en el esquema, `SELECT` en `"User"` y `UPDATE ("role")` en esa tabla. No necesita superusuario, crear tablas ni modificar otras columnas. El administrador de la base prepara esa conexión interna.

`SELECT` sobre `"User"` permite leer datos sensibles, incluidos hashes: el acceso debe ser restringido. Limitar `UPDATE` a `role` impide cambiar `active`, pero no limita qué filas puede modificar el operador. El script no sustituye el control administrativo de quién recibe las credenciales de PostgreSQL.

## Parámetros

| Parámetro `psql` | Valor |
| --- | --- |
| `user_id` | UUID de la cuenta verificada. |
| `role` | `OPERATOR`, `TECHNICIAN`, `ADMINISTRATOR` o `ANALYST`. También `CITIZEN` para retirar la función de personal. |
| `actor` | Nombre o identificador del responsable, obligatorio y no vacío. |

No se admite un rol fuera del enum `"UserRole"`. Escribir los valores en mayúsculas y sin prefijo `ROLE_`.

## Ejemplo de ejecución

Desde la raíz, con `psql` instalado y la base de desarrollo arrancada:

```bash
psql -h localhost -p 5432 -U gestor_personal -d urbanpulse -W \
  -v user_id='7213eebc-f0fe-4004-a1b8-a510872d460e' \
  -v role='TECHNICIAN' \
  -v actor='Responsable de la práctica' \
  -f backend/scripts/habilitar-personal.sql
```

El UUID es ilustrativo: sustituirlo por el de la cuenta de prueba. `gestor_personal` es el nombre ilustrativo de la conexión interna preparada por el administrador; el script no la crea. `-W` solicita su contraseña sin incluirla en el comando ni guardarla en el historial.

Para la base local de Compose se puede usar la conexión `urbanpulse` del contenedor, con su contraseña local. Tiene permisos más amplios: sirve para una prueba de desarrollo, no para distribuir acceso en un despliegue.

El script inicia una transacción, valida los parámetros, bloquea la fila durante el cambio y actualiza solo su rol. `ON_ERROR_STOP` interrumpe `psql` ante un error; al cerrar esa conexión se revierte la transacción fallida. Un error devuelve un código de salida distinto de cero.

Al terminar correctamente aparece `Cuenta <UUID>: CITIZEN -> TECHNICIAN`. Verificar el rol y pedir al usuario **cerrar sesión y volver a entrar**: el JWT anterior conserva su rol. Para volver a ciudadano, repetir con `role='CITIZEN'`.

## Errores y comprobación

| Situación | Resultado |
| --- | --- |
| Usuario inexistente o inactivo | Error; no se modifica ninguna cuenta. |
| `actor` vacío | Error; no se modifica la cuenta. |
| Rol desconocido o UUID incorrecto | Error de validación/conversión; no se aplica el cambio. |
| Faltan permisos SQL o conexión | Error de PostgreSQL/`psql`; revisar con el administrador. |
| Registro HTTP con `role` | `400`; no crea una cuenta privilegiada. |

`StaffProvisioningIntegrationTest` ejecuta el archivo real con `psql` en PostgreSQL/PostGIS. Cubre los cinco roles, cuenta exacta sin modificar otra, rol incorrecto, cuenta inexistente/inactiva, responsable vacío y una conexión limitada a lectura y actualización de `role`. También comprueba que esa conexión no puede modificar `active`.

## Dónde queda registrado el cambio

El script emite un `RAISE LOG` en PostgreSQL con usuario de conexión (`session_user`), responsable declarado, UUID y rol anterior/nuevo. El administrador debe configurar y revisar los logs del servidor; en la base local, `docker compose logs db`.

Es un registro operativo básico. `actor` es texto declarado por quien ejecuta, no una identidad autenticada por la app. Una conexión de PostgreSQL compartida tampoco identifica individualmente al operador. No hay tabla de auditoría, firma, conservación garantizada ni protección frente al administrador de la base. El mensaje se emite antes del `COMMIT`: comprobar también que la ejecución finaliza correctamente; no es una auditoría transaccional duradera. Los cambios SQL por otros medios no pasan por este script.

Retirar el rol no revoca tokens emitidos: conservan sus permisos hasta caducar. Desactivar una cuenta impide el siguiente login, `/me` y crear incidencias al recuperar al usuario; no hay revocación global en el filtro JWT. Véase [autenticacion-jwt.md](autenticacion-jwt.md).
