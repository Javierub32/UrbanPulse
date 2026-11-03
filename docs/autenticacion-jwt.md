# Autenticación de UrbanPulse

Para entrar en UrbanPulse usamos email y contraseña. Después del login, la app recibe un JWT y lo envía al llamar al backend. Aquí se explica cómo probarlo y qué ocurre cuando la sesión caduca.

## Cómo funciona el login

1. El ciudadano se registra con nombre, email y contraseña. Se guarda un hash BCrypt y se asigna `CITIZEN`.
2. El registro devuelve `201`, sin iniciar sesión. La app vuelve al login con una confirmación.
3. El login comprueba que la cuenta existe, está activa, tiene rol y la contraseña coincide con BCrypt.
4. Devuelve un JWT que la app presenta mediante `Authorization: Bearer <token>`.
5. Al restaurar la sesión, la app consulta `/api/auth/me`. Si falla la red se puede reintentar sin borrar la credencial.
6. Al caducar el token se vuelve al login. Al salir se borra la credencial local. No hay renovación automática ni logout en el servidor.

`POST /api/auth/login` recibe:

```json
{"email":"ana@example.com","password":"una-clave-de-ejemplo"}
```

Respuesta `200`:

```json
{
  "accessToken": "<JWT firmado>",
  "tokenType": "Bearer",
  "expiresIn": 259200,
  "user": {
    "id": "7213eebc-f0fe-4004-a1b8-a510872d460e",
    "name": "Ana García",
    "email": "ana@example.com",
    "role": "CITIZEN"
  }
}
```

Los datos públicos del antiguo login están ahora dentro de `user`. La app ya consume ese contrato. `GET /api/auth/me` devuelve solo ese objeto público, sin token ni contraseña. Login, registro y `/me` responden con `Cache-Control: no-store`.

| Ruta | Comprobación actual |
| --- | --- |
| `POST /api/auth/register` | Público; siempre crea un ciudadano activo. |
| `POST /api/auth/login` | Público; comprueba la cuenta y BCrypt. |
| `GET /api/auth/me` | JWT válido; recupera la cuenta y comprueba existencia, actividad y que tenga rol. |
| `POST /api/incidents/create` | JWT con rol `CITIZEN`; el servicio recupera al autor y exige que siga activo. |
| `GET /actuator/health` | Público. |
| OpenAPI y Swagger UI | Consulta pública. |
| Otras rutas | Denegadas en esta entrega; no se anticipan los permisos de #10. |

Credenciales de login incorrectas, cuenta inexistente o inactiva: `401` con `{"message":"Credenciales inválidas"}`. Las rutas protegidas usan `application/problem+json`: `401 UNAUTHENTICATED` con `WWW-Authenticate: Bearer`, o `403 ACCESS_DENIED` si el rol del token no permite la operación. La validación devuelve `400 VALIDATION_ERROR` con errores por campo. No se devuelven secretos ni motivos internos del rechazo de una cuenta.

OpenAPI está en `/v3/api-docs` y Swagger UI en `/swagger-ui.html`. El registro está detallado en [registro-ciudadano.md](registro-ciudadano.md).

## Qué lleva el token

Firma HS256 con clave externa. Claims:

| Claim | Contenido |
| --- | --- |
| `sub` | UUID canónico del usuario. |
| `role` | Uno de `CITIZEN`, `OPERATOR`, `TECHNICIAN`, `ADMINISTRATOR`, `ANALYST`. |
| `iss`, `aud` | Emisor y audiencia configurados. |
| `iat`, `exp` | Emisión y caducidad. |
| `jti` | Identificador aleatorio; no implica una lista de revocación. |

No se incluyen nombre, email ni contraseña. El filtro verifica firma, algoritmo, emisor, audiencia, fechas, UUID y rol del enum. Construye la identidad y la autoridad `ROLE_<role>` del token. **El filtro no consulta PostgreSQL.** Cookies, parámetros de URL y tokens sin firma no sirven como autenticación. Se usa JJWT 0.13.0; su adaptador JSON conserva Jackson 2 con la versión fijada en el POM. Las respuestas HTTP usan Jackson 3 de Spring Boot.

### Cambios de rol y cuentas desactivadas

El rol representa el que tenía el usuario al iniciar sesión. Cambiarlo en PostgreSQL no cambia los tokens ya emitidos: el usuario debe salir y volver a entrar para obtener otro. Los tokens antiguos mantienen su rol hasta caducar, incluso tras una reducción de privilegios. Con la duración predeterminada, esto puede prolongarse hasta 3 días.

`/me` recupera el nombre y email actuales, comprueba la cuenta y devuelve el **rol del JWT**, que es el usado para autorizar. Así la app no muestra un rol distinto al que realmente se aplica.

El filtro, por sí solo, no detecta una cuenta eliminada o desactivada después del login. Las dos operaciones protegidas actuales comprueban su estado usando la consulta que ya necesitan:

- `/me` rechaza cuentas inexistentes, inactivas o sin rol con `401`.
- Crear una incidencia recupera al autor para asociarlo y exige `active=true`; si falta o está inactivo devuelve `401` y no guarda la incidencia. No añade otra consulta de autenticación.

Estas comprobaciones ven el estado al recuperar la cuenta; no cancelan una operación ya en curso. Cada operación nueva tendrá que decidir dónde comprobar el estado. Sin consultar una fuente de revocación no se puede prometer la invalidación inmediata de todos los JWT. No se ha añadido esa infraestructura ni una consulta al filtro.

## Autor de las incidencias

El UUID del autor procede del usuario autenticado. `userId` se ha retirado de `IncidentRequest`; si alguien lo añade al JSON, se ignora. La respuesta mantiene `userId` con el autor real.

```json
{
  "title": "Farola apagada",
  "description": "No funciona desde ayer",
  "category": "STREET_LIGHTING",
  "latitude": 36.7213,
  "longitude": -4.4214
}
```

La categoría obligatoria y la precisión de coordenadas de #11 no se cambian en esta entrega.

## Configurar el backend en desarrollo

Requiere Java 17, Docker para PostGIS y una clave JWT propia. Generar una vez:

```bash
openssl rand -base64 32
```

Guardar el resultado fuera de Git. Desde IntelliJ, añadir `URBANPULSE_JWT_SECRET` en **Run → Edit Configurations → Environment variables**, junto con `URBANPULSE_CORS_ALLOWED_ORIGINS=http://localhost:8081` para probar la web. No usar la clave del perfil de tests.

Desde terminal, exportar esas variables antes de ejecutar Maven. Spring no carga automáticamente el `.env` de la raíz. Con la base de Compose:

```bash
docker compose up -d db
cd backend
bash ./mvnw spring-boot:run
```

El backend usa por defecto `jdbc:postgresql://localhost:5432/urbanpulse`, usuario `urbanpulse`. Si se cambia `POSTGRES_PASSWORD` para crear el contenedor, pasar también `SPRING_DATASOURCE_PASSWORD` a Maven o al IDE. Cambiar la variable no cambia la contraseña de un volumen ya creado.

Alternativa desde la raíz: `docker compose --profile container up --build`. Compose puede leer un `.env` local y pasa las variables al contenedor `api`. Los archivos locales de entorno están ignorados. El secreto nunca se guarda en los ejemplos ni se envía al frontend.

| Variable del backend | Uso |
| --- | --- |
| `URBANPULSE_JWT_SECRET` | Obligatoria: al menos 32 bytes aleatorios en Base64. Falla el arranque si falta o es inadecuada. |
| `URBANPULSE_JWT_ISSUER` | Predeterminado `urbanpulse`. |
| `URBANPULSE_JWT_AUDIENCE` | Predeterminado `urbanpulse-api`. |
| `URBANPULSE_JWT_TTL_SECONDS` | Predeterminado `259200`: 3 días. |
| `URBANPULSE_CORS_ALLOWED_ORIGINS` | Orígenes web exactos separados por comas, sin rutas ni comodines. Vacío no admite otros orígenes web. |

Reutilizar la clave entre reinicios y compartirla entre instancias del mismo despliegue. Cambiarla invalida todos los tokens anteriores. El secreto solo se entrega al backend.

## Configurar y probar la app

Desde `frontend/`, copiar `.env.example` a `.env.local`, configurar `EXPO_PUBLIC_API_URL` y ejecutar:

```bash
npm ci
npm run web
```

Abrir la dirección que indique Expo, por ejemplo `http://localhost:8081/login`. Si cambia el puerto web, añadir ese origen exacto al CORS y reiniciar el backend. `localhost` y `127.0.0.1` son orígenes distintos.

| Cliente | URL de desarrollo del backend |
| --- | --- |
| Navegador en el mismo ordenador | `http://localhost:8080`. |
| Simulador iOS en el mismo Mac | Habitualmente `http://localhost:8080`. |
| Emulador Android estándar | `http://10.0.2.2:8080`, alias del anfitrión. |
| Teléfono físico | `http://<direccion-LAN-del-ordenador>:8080`, misma red y puerto accesible. El `localhost` del teléfono es el teléfono. |

La IP LAN se configura solo en el archivo local. CORS afecta al navegador; una app nativa sigue necesitando conectividad y que su entorno permita el transporte usado. HTTPS es necesario en el despliegue real.

Solo se expone una dirección pública en `EXPO_PUBLIC_API_URL`. Las variables `EXPO_PUBLIC_` se incorporan al cliente: nunca colocar ahí contraseñas o claves JWT. Recargar la app tras cambiarlas y reiniciar Expo si es necesario. [Variables de Expo](https://docs.expo.dev/guides/environment-variables/).

### Sesión y navegación

`AuthContext` concentra `session`, `user`, `loading`, `signIn`, `signUp` y `signOut`. El layout espera la restauración y usa las [rutas protegidas de Expo Router](https://docs.expo.dev/router/advanced/protected/). Los formularios conservan lo escrito ante un error. Un `403` no cierra la sesión; un `401` de una petición privada sí. Las respuestas de otra sesión se descartan.

Se guardan únicamente el token y su vencimiento local, nunca contraseñas:

- Móvil: `expo-secure-store`. Los tests de servicios no prueban el almacén del sistema operativo: requiere comprobación en un dispositivo real.
- Web: `sessionStorage`. Recargar la misma pestaña conserva la sesión. Normalmente cerrarla la elimina; la restauración de pestañas del navegador puede conservarla. Una pestaña independiente no comparte ese estado. No se promete persistencia durante días ni logout sincronizado entre pestañas. Se mantiene esta decisión para la demostración actual; cambiarla requiere acuerdo.

Las escrituras se ejecutan en orden y omiten operaciones de una sesión anterior. Si falla guardar el token, no se completa el login. Si falla borrarlo, se retira la sesión en memoria y se muestra un error para reintentar: no se declara terminado el borrado persistente. En una restauración sin red se conserva el token y se bloquea el acceso hasta verificarlo o elegir salir.

El vencimiento local sirve para la interfaz; el servidor valida la firma y la caducidad real. Borrar el token local no revoca una copia en otro cliente. No hay refresh tokens ni invalidación individual mediante `jti`; una copia del token puede utilizarse hasta que caduque.

La barra inferior y las pantallas iniciales ya existían en `main`. Se conservan; no proceden de copiar la interfaz de TopFive. Las pantallas nuevas de autenticación están en `src/pages/` y sus rutas en `src/app/`.

## Ejecutar las pruebas

Backend, desde `backend/`: `bash ./mvnw -B -ntp test`, con Java 17 y Docker para Testcontainers/PostGIS.

Frontend, desde `frontend/`: `npm test`, `npm run lint` y `npx tsc --noEmit`. Los tests requieren Node 22.18+ o Node 24+, por la ejecución de TypeScript y los hooks de módulos de Node. Se han ejecutado con Node 25.9.0. Son tests de servicios, almacenamiento web simulado y concurrencia, no tests de renderizado nativo.

El contraste con los proyectos del equipo está en [patrones-autenticacion-equipo.md](patrones-autenticacion-equipo.md).
