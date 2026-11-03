---
name: desarrollar-feat
description: Implementa nuevas funcionalidades del frontend de UrbanPulse con Expo y React Native. Úsala cuando se pida añadir una pantalla o funcionalidad a la app.
---

# Nueva funcionalidad del frontend

1. Lee `frontend/AGENTS.md` e inspecciona la pantalla, las dependencias
   y el sistema de diseño existentes antes de implementar.

2. Consulta y aplica las skills `expo-native-ui` y
   `expo-design-system`. Si alguna no está disponible:

   - Comprueba si está instalada en las skills del usuario o del proyecto.
   - Si falta, instálala desde el repositorio oficial `expo/skills`,
     usando el mecanismo de instalación disponible en el entorno.
   - Lee su `SKILL.md` y los recursos que necesites para la tarea.
   - Si no se puede instalar o acceder a ella, informa de la limitación
     y continúa con las instrucciones disponibles.

3. Mantén las rutas y layouts de Expo Router en `frontend/src/app/`.
   Coloca los archivos específicos de cada pantalla en:

   `frontend/src/pages/<nombre-pagina>/`

   Organízalos por responsabilidad cuando sea necesario:

   - `components/`: componentes propios de la página.
   - `hooks/`: estado y lógica de la página.
   - `services/`: acceso a API y servicios externos.

   Crea solo las carpetas y archivos necesarios. Reutiliza los
   componentes, hooks y estilos compartidos que ya existan.

4. Si la funcionalidad consume el backend, consulta el contrato real:
   rutas, DTO, validaciones y errores. No modifiques el backend salvo
   que la tarea lo autorice.

5. Implementa los estados de carga, error, vacío y contenido cuando
   correspondan. Comprueba accesibilidad, adaptación a distintas
   pantallas y recuperación ante errores.