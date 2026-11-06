# Guía de desarrollo

Esta guía explica cómo preparar UrbanPulse para trabajar en el backend y en la app.

## Requisitos

Necesitas Git, Docker en ejecución y el Docker Compose v2.

Para ejecutar el backend fuera de Docker necesitas un JDK 17. El repositorio ya incluye Maven wrapper.

Para el frontend necesitas Node.js y npm. Una opción compatible con las dependencias actuales es Node.js 22, a partir de la versión 22.13.

Los ejemplos de esta guía utilizan npm. El repositorio también contiene un lockfile de pnpm; conviene acordar un único gestor antes de modificar dependencias.

## Clonar el repositorio

```bash
git clone https://github.com/Javierub32/UrbanPulse.git
cd UrbanPulse
```

Los comandos de Docker se ejecutan desde esta carpeta, donde está [`compose.yml`](../compose.yml).

## Ejecutar el backend

Durante el desarrollo puedes dejar la base de datos en Docker y ejecutar la API con Maven.

Primero inicia PostGIS desde la raíz del repositorio:

```bash
docker compose up -d db
```

Después entra en el backend:

```bash
cd backend
```

En Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

En macOS/Linux:

```bash
bash ./mvnw spring-boot:run
```

Spring Boot utiliza la integración con Compose para obtener la conexión a la base de datos. Flyway aplica las migraciones al arrancar.

La API escucha en el puerto 8080 y PostgreSQL en el 5432. Si ya tienes la API ejecutándose en Docker, detén ese contenedor antes de arrancarla con Maven. Desde la raíz:

```bash
docker compose --profile container stop api
```

Si prefieres ejecutar también la API en Docker, los pasos están en el [README](../README.md#3-arrancar-la-api-y-postgis).

## Configuración local

Para cambiar la contraseña de la base de datos, crea un `.env` en la raíz y añade esta variable con el valor que quieras utilizar:

```dotenv
POSTGRES_PASSWORD=tu-contraseña-local
```

Compose utiliza ese valor para la base de datos y para la API en contenedor. Cuando ejecutas con Maven, la integración de Spring Boot con Compose obtiene los datos de conexión.

El fichero `.env.example` de la raíz está vacío actualmente. IMPORTANTE: No incluir tu `.env` en el repositorio.

Si la base ya se había creado, cambiar el `.env` no modifica la contraseña guardada en PostgreSQL. Tendrás que utilizar la contraseña original o actualizarla en la base de datos.

El [README](../README.md#usar-otra-base-de-datos) también explica cómo configurar una base de datos externa mediante variables de entorno.

## Ejecutar el frontend

Abre otra terminal y entra en la carpeta frontend del repositorio:

```bash
cd frontend
```

Instala las dependencias:

```bash
npm install
```

Arranca el servidor de desarrollo:

```bash
npm start
```

Para abrir la versión web:

```bash
npm run web
```

## Dirección de la API

La app permite indicar la URL del backend mediante `EXPO_PUBLIC_API_URL`. Puedes definirla en un `.env.local` dentro de `frontend/`:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Desde un móvil físico, utiliza la IP local del ordenador que ejecuta la API. Por ejemplo:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080
```

El móvil debe poder acceder a esa dirección. `localhost` desde el teléfono apunta al propio teléfono.

Si no defines la variable, el servicio intenta obtener la dirección a partir del entorno de ejecución.

Para las peticiones de incidencias desde el navegador, el backend permite actualmente el origen `http://localhost:8081`. Si utilizas otro host o puerto, tendrás que ajustar esa configuración.

## Pruebas y comprobaciones

Desde `backend/`, ejecuta las pruebas.

En Windows:

```powershell
.\mvnw.cmd test
```

En macOS/linux:

```bash
bash ./mvnw test
```

Las pruebas de integración levantan una base PostGIS temporal con Testcontainers. Necesitan docker, pero no utilizan la base de desarrollo.

Desde `frontend/`, comprueba los tipos:

```bash
npx tsc --noEmit
```

Existe un comando `npm run lint`, aunque la configuración de ESLint todavía está pendiente en el repositorio. Tampoco hay un script de tests del frontend.

Para una comprobación manual, arranca la API y la app, consulta el listado y el mapa, y registra una incidencia. Comprueba que aparece después de volver a consultar los datos.

La app utiliza actualmente un usuario sintético creado por la migración V4 para enviar los avisos.

## Consultar la API

Con el backend en ejecución puedes comprobar el estado del servidor en:

[http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)

Consultar los endpoints en Swagger UI:

[http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

Y obtener el contrato OpenAPI en:

[http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

Las normas para trabajar con ramas, commits y pull requests están en [CONTRIBUTING.md](../CONTRIBUTING.md).
