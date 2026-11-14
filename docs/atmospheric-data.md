# Datos atmosféricos de incidencias

La integración usa Open-Meteo para asociar datos modelizados a las incidencias nuevas de Málaga. No son mediciones realizadas en el punto exacto del aviso. Se eligió porque permite consultar por coordenadas y hora tanto variables meteorológicas como calidad del aire, incluida la cobertura europea CAMS, sin requerir una clave para estas consultas. Así se puede resolver la integración desde el backend con un único proveedor y conservar la hora y la celda de modelo devueltas. La cobertura del aire es más gruesa que la ubicación puntual y los datos no deben interpretarse como mediciones locales.

## Datos y asociación

| Dato | Variable de Open-Meteo | Unidad |
| --- | --- | --- |
| Precipitación total (lluvia y chubascos; también nieve si la hay) | `precipitation` | mm |
| Partículas finas | `pm2_5` | µg/m³ |
| Partículas | `pm10` | µg/m³ |
| Dióxido de nitrógeno | `nitrogen_dioxide` | µg/m³ |

Se consultarán las coordenadas WGS84 de la incidencia y se asociará a cada variable la hora UTC más reciente que no sea posterior a `registeredAt`. Para la precipitación, la marca horaria representa el total de la hora anterior; para los contaminantes, el valor corresponde a la hora indicada. Por ejemplo, para una incidencia registrada a las 14:32 UTC se usaría la marca de las 14:00 UTC. Cada dato conservará su fuente, unidad, hora de referencia, fecha de consulta y coordenadas solicitadas y devueltas por la API.

Los datos disponibles se guardan como filas de `UrbanContext`, vinculadas a la incidencia (`WEATHER` para precipitación y `ENVIRONMENT` para aire). Cada fila guarda la variable, el valor, la unidad, la hora observada, la fecha de consulta, la fuente y la celda del modelo. Si se vuelve a ejecutar el enriquecimiento, se actualiza la fila existente de esa variable y fuente para evitar duplicados. Si no hay datos para la hora consultada, no se crea una fila para esa variable. Si falla una fuente, se omiten sus datos y se conserva cualquier lectura obtenida de la otra; el fallo de la consulta no impide registrar la incidencia. La excepción de consulta se maneja sin emitir un log.

## Configuración y funcionamiento

El backend consulta las fuentes después de guardar la incidencia. Si una variable no está disponible, solo se guardan las lecturas presentes. Si ambas fuentes fallan o no devuelven datos para la hora solicitada, la incidencia se conserva sin datos atmosféricos.

Las URL y los tiempos de espera se configuran mediante estas variables de entorno; si no se especifican, se usan los valores por defecto:

| Variable | Valor por defecto |
| --- | --- |
| `URBANPULSE_OPEN_METEO_WEATHER_URL` | `https://api.open-meteo.com/v1/forecast` |
| `URBANPULSE_OPEN_METEO_AIR_QUALITY_URL` | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| `URBANPULSE_OPEN_METEO_CONNECT_TIMEOUT_MS` | `2000` |
| `URBANPULSE_OPEN_METEO_REQUEST_TIMEOUT_MS` | `4000` |

No se configura una clave de API para estas consultas. El frontend muestra las variables con sus unidades y una atribución compacta al final de la lista; cuando hay lecturas de calidad del aire, también atribuye CAMS ENSEMBLE.

## Cobertura y uso

La [API meteorológica](https://open-meteo.com/en/docs) ofrece precipitación horaria por coordenadas.
La [API de calidad del aire](https://open-meteo.com/en/docs/air-quality-api) utiliza para Málaga el dominio europeo CAMS, con resolución aproximada de 11 km y datos horarios.
La cobertura efectiva y los valores disponibles se comprobarán en cada respuesta.
