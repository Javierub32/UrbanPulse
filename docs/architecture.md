# Arquitectura de UrbanPulse

UrbanPulse permite comunicar incidencias urbanas y consultar su ubicación. El proyecto reúne una app en expo y React native, una API en Spring boot y una base de datos PostgreSQL con PostGIS.

El código se mantiene en un mismo repositorio. La app y la API son aplicaciones separadas; la base de datos se utiliza desde el backend.

## Componentes principales

La app muestra las incidencias, las sitúa en el mapa y permite enviar nuevos avisos.

La API recibe las peticiones, valida los datos y aplica las reglas de la aplicación.

PostgreSQL almacena los datos del sistema. PostGIS añade el soporte para guardar y trabajar con ubicaciones geográficas.

Flyway aplica los cambios del esquema y carga los datos incluidos en las migraciones.

La comunicación entre la app y la API utiliza HTTP y JSON. La API accede a PostgreSQL mediante Spring Data JPA e hibernate.

## Organización del backend

El backend utiliza Java 17 y Spring boot. Actualmente se ejecuta como una única aplicación, con el código organizado en capas.

La carpeta `controller` contiene los controladores que definen los endpoints y reciben las peticiones. Los datos de entrada y salida se representan mediante los DTO de la carpeta `dto`.

Los `service` contienen las reglas de aplicación y coordinan las operaciones. Para consultar y guardar datos utilizan los `repository`. Las `entity` representan el modelo almacenado en la base de datos.

Las conversiones entre entidades y DTO se realizan en `mapper`. La carpeta `exception` contiene las excepciones y el tratamiento de errores de la API.

Por ejemplo, al crear una incidencia, el controlador valida la petición y la pasa al servicio. El servicio comprueba que el usuario existe, prepara la incidencia con su estado inicial y la guarda a través del repositorio. La respuesta se construye con un DTO.

La API dispone de un endpoint de login que comprueba las credenciales. La integración de la identidad del usuario en el flujo de la app sigue pendiente: el envío de incidencias utiliza por ahora un usuario sintético de demostración, proximamente integraremos el login con jwt a todo el proyecto.

## Organización del frontend

El frontend utiliza TypeScript, expo y React Native. Las rutas y los layouts están en la carpeta [`frontend/src/app/`](../frontend/src/app/) y se gestionan con Expo Router.

Los componentes compartidos están en [`frontend/src/components/`](../frontend/src/components/). En [`frontend/src/pages/`](../frontend/src/pages/) se agrupan hooks, servicios y componentes de funcionalidades concretas, como el registro de avisos y la consulta del mapa.

Las peticiones para crear y consultar incidencias están en [`frontend/src/pages/report/services/report-service.ts`](../frontend/src/pages/report/services/report-service.ts). Los hooks utilizan ese servicio y mantienen los estados de carga, éxito y error de las pantallas.

Algunos componentes tienen una variante `.web.tsx` para adaptar su implementación al navegador, como ocurre con los mapas.

## Persistencia

PostGIS amplía PostgreSQL para almacenar y trabajar con información geográfica. Las ubicaciones de las incidencias se guardan con el sistema de referencia SRID 4326.

Las migraciones están en [`backend/src/main/resources/db/migration/`](../backend/src/main/resources/db/migration/). Flyway las aplica al arrancar la API. Hibernate tiene configurado `ddl-auto=validate`: comprueba que las entidades coinciden con el esquema, mientras que los cambios de estructura se realizan mediante migraciones.

Las migraciones actuales también incluyen activos urbanos e incidencias sintéticas para probar el proyecto.

## Arquitectura prevista

El modelo C4, definido en [`docs/workspace.dsl`](workspace.dsl), describe una visión más amplia del sistema: identidad y acceso, gestión de incidencias, contexto urbano, asistencia inteligente, analítica y notificaciones, además de un portal de gestión.

Ese modelo sirve como referencia para el desarrollo. Algunas de esas capacidades todavía no tienen una implementación completa en el repositorio.

El backend se plantea como un monolito organizado por dominios. El código actual está separado principalmente por capas técnicas. La posible evolución hacia microservicios sigue siendo una propuesta pendiente de concretar.

Los motivos y consecuencias de estas decisiones están recogidos en los ADR de [`docs/adr/`](adr/).
