# Referencias del equipo para la autenticación

Para organizar el login hemos tomado como referencia los proyectos del equipo: TopFive para el contexto de React y Bancosol para JWT. Estas notas recogen qué partes hemos aprovechado y cuáles hemos tenido que adaptar.

## Fuentes y versiones

- UrbanPulse: `main` en `46ac519e644966181493b5669fd7a1a79f53ef3a`, contrastado con los archivos locales y el diff de `feature/auth-register`. Controladores, `AuthService`, `IncidentService`, DTO, mappers, repositorios, layouts, navegación y tema existentes.
- TopFive: `main` en `be9782b16e65b4f743f68e566e8c1524375138a9`. Se han leído completos [AuthContext.js](https://github.com/Javierub32/TopFive/blob/be9782b16e65b4f743f68e566e8c1524375138a9/context/AuthContext.js), [layout raíz](https://github.com/Javierub32/TopFive/blob/be9782b16e65b4f743f68e566e8c1524375138a9/app/_layout.tsx), [login](https://github.com/Javierub32/TopFive/blob/be9782b16e65b4f743f68e566e8c1524375138a9/app/%28auth%29/login.tsx), [registro](https://github.com/Javierub32/TopFive/blob/be9782b16e65b4f743f68e566e8c1524375138a9/app/%28auth%29/register.tsx), `AppTextInput.tsx`, el cliente Supabase y las dependencias.
- Proyecto-Bancosol: `main` en `53db9e4873d796815b8a43e9b1353c2920dd3e62`. Se han contrastado el árbol y los archivos actuales: [AuthController](https://github.com/Javierub32/Proyecto-Bancosol/blob/53db9e4873d796815b8a43e9b1353c2920dd3e62/src/main/java/com/leftjoiners/bancosol/proyectobackend/controller/AuthController.java), [ColaboradorService](https://github.com/Javierub32/Proyecto-Bancosol/blob/53db9e4873d796815b8a43e9b1353c2920dd3e62/src/main/java/com/leftjoiners/bancosol/proyectobackend/service/ColaboradorService.java) y [ColaboradorMapper](https://github.com/Javierub32/Proyecto-Bancosol/blob/53db9e4873d796815b8a43e9b1353c2920dd3e62/src/main/java/com/leftjoiners/bancosol/proyectobackend/mapper/ColaboradorMapper.java).
- El `main` de ese repositorio de Bancosol no contiene las clases JWT del repomix facilitado. La referencia de JWT procede específicamente del repomix local de **v2-Proyecto-Bancosol**: `AuthRestController`, `JwtUtil`, `JwtAuthFilter`, `SecurityConfig`, `UsuarioService` y `UsuarioMapper`. No deben confundirse las dos versiones.


## Frontend: qué se conserva de TopFive

| Patrón observado | Aplicación en UrbanPulse |
| --- | --- |
| `AuthProvider` con `session`, `user`, `loading` y `useAuth`. | Un proveedor central, con esos conceptos y acciones `signIn`, `signUp`, `signOut`. Las pantallas delegan en él. |
| Campos con `useState`, envío asíncrono, `try/catch/finally` y bloqueo de envío mientras carga. | Login y registro mantienen el borrador y muestran errores sin borrar lo escrito. |
| El login no hace su propia redirección de éxito; el layout observa la sesión. | El layout controla los grupos autenticado/público. Se espera la restauración para evitar mostrar fugazmente el login. |
| Registro con confirmación de contraseña y vuelta al login. | Mismo flujo, con aviso de cuenta creada. El registro no inicia sesión automáticamente. |
| Componentes de texto/input y tema compartidos. | Se reutilizan `ThemedText`, el tema de UrbanPulse y controles comunes del formulario, sin duplicar el sistema visual. |
| Limpieza de datos al cambiar de cuenta. | Se limpian identidad y credencial y se abortan/descartan peticiones de la sesión anterior. No se añade una caché que la app no necesita todavía. |

TopFive usa Supabase Auth, `onAuthStateChange` y la persistencia/renovación del cliente de Supabase. UrbanPulse usa su API Spring y un JWT sin refresh. No se han copiado Supabase, acceso Google/Apple, recuperación de contraseña, notificaciones, anuncios, enlaces de confirmación ni los proveedores de colecciones o búsquedas.

Tampoco se han copiado gradientes, iconografía, contenido ni la barra de navegación de TopFive. La barra inferior de UrbanPulse ya estaba en `main`. Las pantallas de inicio, mapa y otras pestañas se conservan; agrupar sus rutas en `(tabs)` permite que el layout de autenticación las proteja sin cambiar sus URLs. Perfil solo muestra los datos de sesión y permite salir.

TopFive redirige con `useEffect`, segmentos y `router.replace`. Aquí se usa `Stack.Protected`, disponible en el Expo Router instalado: conserva la decisión central en el layout y evita duplicar redirecciones en cada formulario. Las rutas siguen en `src/app/`; los formularios en `src/pages/`, conforme a las instrucciones del equipo para UrbanPulse.

## Backend: qué se conserva de Bancosol y UrbanPulse

| Patrón observado | Aplicación en UrbanPulse |
| --- | --- |
| Controller que recibe un DTO y delega en un servicio. | `AuthController` conserva ese límite; el servicio comprueba credenciales, registra y emite el token. |
| Servicio que coordina repositorios y mappers explícitos. | No se expone `UserEntity`. `RegisterMapper` y `LoginResponseMapper` construyen respuestas públicas. |
| `MapperDTO` y `toDTO`, con setters explícitos. | Se siguen las convenciones ya presentes; no se añade otra herramienta de mapeo. |
| Inyección por constructor y Lombok. | Dependencias `private final` y `@RequiredArgsConstructor`, como exige el proyecto actual. DTO con Lombok, sin cambiar las entidades ni Flyway. |
| Emisión JWT, filtro antes del de usuario/contraseña, `SecurityContext` y `STATELESS`. | Misma separación de responsabilidades, con el identificador y rol del usuario dentro del token. |
| El filtro de Bancosol obtiene el rol del JWT sin cargar al usuario. | Se conserva esa decisión. La existencia/actividad se comprueba cuando el servicio ya necesita recuperar la cuenta. |

La clave se externaliza y se mantiene estable entre arranques: no se copia la generación de una clave nueva al iniciar Bancosol. Se valida una sola vez el token para obtener sus claims. Se usan los cinco roles de UrbanPulse, UUID en `sub` y `role` sin prefijo; `ROLE_` se añade únicamente al crear la autoridad de Spring.

El login BCrypt y sus límites existentes se conservan. No se copia la comparación de contraseñas mediante `LIKE`, el retorno de token/usuario nulos con éxito HTTP, ni las trazas de autenticación de Bancosol. La API acepta solo Bearer y usa orígenes CORS explícitos sin cookies; no se trasladan las necesidades de JSP ni el CORS abierto del proyecto anterior.

Se emplea la API correspondiente a JJWT 0.13.0, en vez de pegar las llamadas de 0.11.5. La versión de Spring Boot actual usa Jackson 3 para HTTP; el adaptador JSON de JJWT usa Jackson 2, fijado en el POM. Son adaptaciones de compatibilidad, no un cambio de arquitectura.

## Guardado de la sesión

El control de versión de la sesión impide que un login viejo reemplace al siguiente. Una pequeña cola en `session.ts` ordena el guardado y borrado del token: sin ella una escritura antigua podía terminar después del logout o borrar la credencial de otra cuenta. El cliente HTTP descarta también respuestas correctas de sesiones anteriores. Son protecciones de operaciones asíncronas del flujo actual, no un sistema nuevo de sesiones del servidor.

El SQL de habilitación de personal resuelve el criterio explícito de #9 mediante una herramienta que el backend ya utiliza, PostgreSQL. No añade panel, endpoint administrativo, entidad de auditoría ni migración. Sus límites se explican en [habilitar-personal.md](habilitar-personal.md).

Los comentarios nuevos necesarios se escriben en español. Se han retirado los comentarios ingleses añadidos durante este trabajo; no se borran comentarios del código previo ni se inventan porcentajes de autoría.
