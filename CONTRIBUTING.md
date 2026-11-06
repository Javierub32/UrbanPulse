# Cómo contribuir a UrbanPulse

Organizamos el trabajo con issues y GitHub Projects. Antes de empezar una tarea, revisa el tablero para ver si ya está asignada o si alguien está trabajando en algo relacionado.

Si encuentras un fallo, abre un issue indicando qué estabas haciendo, qué resultado esperabas y qué ocurrió. Si puedes, añade los pasos para reproducirlo y una captura. Para proponer una funcionalidad, explica para qué serviría y qué necesidad cubriría.

## Preparar un cambio

Parte de una versión actualizada de `main` y crea una rama para tu tarea:

```bash
git switch main
git pull
git switch -c docs/guia-desarrollo
```

El nombre debe ayudar a identificar el cambio. Usamos prefijos como `feature/`, `fix/`, `docs/`, `refactor/` y `test/`.

Procura que cada rama tenga un objetivo concreto. Si al trabajar encuentras otro problema que no está relacionado, puedes abrir un issue para tratarlo por separado.

La preparación del entorno y los comandos para ejecutar el proyecto están en la [guía de desarrollo](docs/development.md).

## Commits

Escribe mensajes que permitan entender qué has cambiado sin tener que abrir el diff. Seguimos el formato de Conventional Commits:

- feat: añadir filtro de incidencias por categoría
- fix: corregir la validación de coordenadas
- docs: explicar cómo arrancar la app
- test: cubrir la creación de incidencias

Los tipos mas habituales son feat, fix, docs, test, refactor y chore. Es preferible hacer varios commits con una finalidad clara que reunir cambios distintos bajo un mensaje como «arreglos».

## Antes de abrir una pull request

Revisa el diff y comprueba que solo contiene los cambios de la tarea.

Si has modificado el backend, ejecuta desde `backend/`:

En Windows:

```powershell
.\mvnw.cmd test
```

En macOS/Linux:

```bash
bash ./mvnw test
```

Docker debe estar en ejecución para las pruebas de integración que utilizan Testcontainers.

Si has modificado el frontend, comprueba los tipos desde `frontend/`:

```bash
npx tsc --noEmit
```

Prueba también las pantallas afectadas. Si cambias una llamada a la API, revisa tanto la petición de la app como la respuesta del backend.

Actualiza la documentación cuando cambien los pasos de ejecución, la configuración o el comportamiento del proyecto. No incluyas contraseñas, tokens ni ficheros `.env` en el commit.

## Abrir y revisar la pull request

Sube tu rama y abre una pull request hacia `main`. El repositorio incluye una [plantilla de PR](.github/pull_request_template.md) para explicar qué cambia, por qué y cómo lo has probado. Si afecta a la interfaz, añade capturas que ayuden a revisar el resultado.

Relaciona la PR con su issue cuando corresponda, por ejemplo con `Closes #12`.

GitHub Actions ejecuta los tests del backend en las pull requests dirigidas a `main`. Revisa el resultado y resuelve los fallos antes de integrar el cambio. Solicita revisión a otro miembro del equipo y atiende los comentarios que queden pendientes.
