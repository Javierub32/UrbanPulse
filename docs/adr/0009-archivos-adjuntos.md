# ADR 0009: Adjuntos y portada de incidencias

## Estado

Accepted.

## Contexto

Los ciudadanos adjuntan fotos y vídeos al reportar desde el móvil. Los operadores consultan esos archivos desde la web. El detalle necesita una portada que identifique la incidencia y conserve la galería y sus permisos.

## Opciones consideradas

1. Guardar una copia de la portada en MinIO.
2. Guardar una referencia explícita a la portada en PostgreSQL.
3. Mostrar como portada la primera foto del listado de adjuntos.

## Decisión

Conservar los archivos en MinIO privado y sus rutas relativas en PostgreSQL. El detalle muestra como portada la primera foto del listado autorizado en el recuadro de imagen existente. Las demás fotos y todos los vídeos aparecen al final en una galería que se omite cuando no quedan archivos. La app envía los adjuntos en orden de selección y la API los lista por fecha de creación. Si no hay fotos, el recuadro muestra «Sin imagen».

## Consecuencias

- Las incidencias existentes con fotos obtienen una portada sin migrar sus datos.
- La portada reutiliza el archivo y los permisos de lectura del adjunto.
- La vista depende de que el listado y la descarga autorizada estén disponibles.
- La portada queda determinada por el orden de las fotos guardadas. Elegir otra requeriría ampliar el modelo.
