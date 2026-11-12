# UrbanPulse

UrbanPulse es un proyecto para comunicar y gestionar incidencias en la ciudad, como una farola averiada o un desperfecto en la vía pública. El repositorio reúne la API en Java con Spring Boot y la app en Expo y React Native. La base de datos usa PostgreSQL con PostGIS para guardar las ubicaciones.

## Cómo arrancar el servidor

### Requisitos

- Git para clonar el repositorio.
- Docker en ejecución y Docker Compose v2. Puedes comprobar que están disponibles con `docker info` y `docker compose version`.
- Los puertos `8080` y `5432` libres: los usan la API y la base de datos.

Con Docker puedes arrancar todo sin instalar Java ni Maven en tu máquina.

### 1. Clonar el proyecto

```bash
git clone https://github.com/Javierub32/UrbanPulse.git
cd UrbanPulse
```

Los comandos de Docker de esta guía se ejecutan desde la raíz del repositorio, donde está `compose.yml`.

### 2. Configurar la base de datos

Para probar el proyecto en local puedes usar la configuración que ya trae Compose:

| Dato | Valor |
| --- | --- |
| Host desde tu máquina | `localhost` |
| Puerto | `5432` |
| Base de datos | `urbanpulse` |
| Usuario | `urbanpulse` |
| Contraseña por defecto | `dev-only-change-me` |

Si quieres usar otra contraseña, crea un fichero `.env` en la raíz con este contenido, cambiando el valor por el que vayas a utilizar:

```dotenv
POSTGRES_PASSWORD=urbanpulse-local
```

Compose lee ese fichero y pasa la misma contraseña a la base de datos y a la API. El `.env` es configuración local; no lo incluyas en el commit. El fichero `.env.example` documenta las variables disponibles.

La API requiere también `URBANPULSE_JWT_SECRET`: añade al `.env` una clave aleatoria en Base64 de al menos 32 bytes. Consulta [la guía de autenticación](docs/autenticacion-jwt.md) para generarla y configurar el acceso desde la app.

### 3. Arrancar la API y PostGIS

```bash
docker compose --profile container up --build -d
```

El perfil `container` incluye la API. Si ejecutas `docker compose up -d` sin ese perfil, solo se inicia la base de datos.

La primera vez se descargan las imágenes y las dependencias del backend. Cuando PostGIS está listo, arranca la API y Flyway aplica las migraciones de `backend/src/main/resources/db/migration`. Estas crean el esquema y cargan activos urbanos, incidencias y diez usuarios sintéticos de demostración (dos por cada rol). No hay que ejecutar los SQL a mano.

Las cuentas sintéticas usan la contraseña `urbanpulse`. Sus correos son `ciudadano1@urbanpulse.invalid` y `ciudadano2@urbanpulse.invalid`, y siguen el mismo patrón para `operador`, `tecnico`, `administrador` y `analista`. Son credenciales públicas para pruebas: no deben usarse en producción.

Puedes ver el estado de los contenedores y seguir el arranque con:

```bash
docker compose --profile container ps
docker compose --profile container logs -f api
```

### 4. Comprobar que funciona

Cuando termine el arranque, abre [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) o ejecuta:

```bash
curl -i http://localhost:8080/actuator/health
```

La respuesta debe tener estado HTTP `200` y mostrar `"status":"UP"`. Esta comprobación incluye la conexión con la base de datos.

También puedes abrir [Swagger UI](http://localhost:8080/swagger-ui.html) para consultar los endpoints. La descripción OpenAPI está en [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs).

## Arrancar el backend con Maven

Si vas a trabajar en el código Java, puedes ejecutar la API en tu máquina y dejar PostGIS en Docker. Para esta opción necesitas un JDK 17. Maven se descarga con el wrapper incluido en el proyecto.

Si tenías la API en Docker, párala antes para liberar el puerto `8080`:

```bash
docker compose --profile container stop api
```

Desde la raíz, inicia la base de datos y entra en el backend:

```bash
docker compose up -d db
cd backend
```

En macOS o Linux:

```bash
bash ./mvnw spring-boot:run
```

En Windows, desde PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

Ejecuta Maven desde `backend/`: la configuración busca el fichero `../compose.yml`. Spring Boot obtiene la conexión de la base de datos a través de Compose, incluida la contraseña definida en el `.env` de la raíz. Puedes comprobar el servidor con la misma URL de salud del apartado anterior.

### Usar otra base de datos

Si prefieres gestionar la conexión por tu cuenta, desactiva la integración con Compose y configura estas variables en el entorno del proceso Java:

| Variable | Valor para una base local |
| --- | --- |
| `SPRING_DOCKER_COMPOSE_ENABLED` | `false` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/urbanpulse` |
| `SPRING_DATASOURCE_USERNAME` | `urbanpulse` |
| `SPRING_DATASOURCE_PASSWORD` | La contraseña de esa base de datos |

Spring Boot no carga estas variables directamente del `.env` de la raíz. Por ejemplo, en macOS o Linux, con PostGIS ya en marcha y desde `backend/`:

```bash
export SPRING_DOCKER_COMPOSE_ENABLED=false
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/urbanpulse
export SPRING_DATASOURCE_USERNAME=urbanpulse
export SPRING_DATASOURCE_PASSWORD=urbanpulse-local
bash ./mvnw spring-boot:run
```

Usa una base con PostGIS y permisos para aplicar las migraciones de Flyway.

## Si algo falla al arrancar

- **Puerto ocupado:** comprueba si ya hay otra API en `8080` o un PostgreSQL en `5432`. Para ese proceso antes de volver a arrancar.
- **Error de conexión o contraseña:** revisa los logs con `docker compose --profile container logs db api`. Si cambiaste `POSTGRES_PASSWORD` después de crear la base, el `.env` no cambia la contraseña del usuario que ya existe en el volumen. Usa la contraseña con la que se creó o actualízala en PostgreSQL.
- **No se encuentra `compose.yml` al usar Maven:** comprueba que estás ejecutando el wrapper desde `backend/`.

## Dónde está cada parte

- [`backend/`](backend/): API, migraciones de Flyway y tests.
- [`frontend/`](frontend/): app en Expo y React Native.
- [`compose.yml`](compose.yml): configuración de la base de datos y del contenedor de la API.
- [`docs/workspace.dsl`](docs/workspace.dsl): modelo C4 del proyecto.
