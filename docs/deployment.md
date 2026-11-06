# Guía de despliegue

Actualmente UrbanPulse incluye una configuración de Docker Compose para ejecutar la API y PostgreSQL con PostGIS. Esta guía describe ese entorno, que sirve para realizar pruebas y demostraciones.

El despliegue cloud y la distribución del frontend todavía están pendientes de definir.

## Preparar el entorno

Necesitas Docker en ejecución, Docker Compose v2 y el repositorio clonado. Los puertos 8080 y 5432 deben estar disponibles.

Desde la raíz del proyecto, crea un `.env` con la contraseña de la base de datos:

```dotenv
POSTGRES_PASSWORD=tu-contraseña-del-entorno
```

Antes de desplegar una versión, comprueba que corresponde al cambio revisado y que ha superado las pruebas. Puedes ejecutar la suite del backend desde `backend/`.

En Windows:

```powershell
.\mvnw.cmd test
```

En macOS/linux:

```bash
bash ./mvnw test
```

## Construir y arrancar

Desde la raíz:

```bash
docker compose --profile container up --build -d
```

El perfil `container` incluye la API. Sin ese perfil, Compose solo arranca la base de datos.

El [`Dockerfile` del backend](../backend/Dockerfile) compila la aplicación con Maven y Java 17. Después copia el JAR a una imagen con el entorno de ejecución de Java.

La construcción de la imagen omite los tests, por lo que deben haberse ejecutado antes.

Compose espera a que la base de datos esté preparada antes de iniciar la API. Durante el arranque, Flyway aplica las migraciones pendientes.

## Comprobar el resultado

Consulta el estado de los servicios:

```bash
docker compose --profile container ps
```

Comprueba la salud de la API:

```bash
curl -i http://localhost:8080/actuator/health
```

La respuesta debe tener estado HTTP 200 y mostrar `"status":"UP"`.

Para revisar los logs:

```bash
docker compose --profile container logs -f api
```

Comprueba también que puedes consultar las incidencias desde la app y que la API responde a las operaciones que necesita la versión desplegada.

## Datos y configuración

La base utiliza el volumen `urbanpulse-db` para conservar los datos entre arranques. Detener los contenedores no borra ese volumen.

Las migraciones actuales cargan datos sintéticos de demostración. Antes de utilizar este procedimiento con datos reales habrá que revisar esa carga inicial.

La API recibe la conexión a PostgreSQL mediante `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`. Compose configura estas variables para que la API acceda al servicio `db`.

## Actualizar y detener

Para actualizar el entorno, sitúa el repositorio en la versión revisada que quieras ejecutar y repite:

```bash
docker compose --profile container up --build -d
```

Después vuelve a comprobar la salud del servidor y las operaciones principales. Este procedimiento puede interrumpir temporalmente la API.

Para detener los servicios:

```bash
docker compose --profile container down
```

No añadas `-v` si quieres conservar la base de datos.

## Recuperación ante fallos

Si la nueva versión falla, revisa primero los logs de la API y de PostgreSQL.

Volver a construir una versión anterior del código no revierte las migraciones que ya se hayan aplicado. Si una actualización modifica el esquema, habrá que comprobar la compatibilidad con la versión anterior y disponer de una copia de seguridad antes de actualizar.

Actualmente no hay un procedimiento automatizado de rollback.

## Despliegue fuera del entorno local

Queda por concretar dónde se alojarán la API y la base de datos, cómo se publicarán las versiones y cómo se distribuirá el frontend.

Antes de ofrecer el servicio fuera del entorno de pruebas habrá que completar la gestión de identidad y permisos, configurar HTTPS, restringir el acceso a PostgreSQL y definir las copias de seguridad.

El repositorio tampoco incluye todavía una configuración de publicación web o de distribución móvil. El servidor de desarrollo de Expo se utiliza para trabajar y probar la app.
