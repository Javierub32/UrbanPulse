# Datos atmosféricos de incidencias

La integración propuesta usa Open-Meteo para asociar datos modelizados a las incidencias nuevas de Málaga. No son mediciones realizadas en el punto exacto del aviso. La consulta se hará desde el backend después de guardar la incidencia; un fallo de Open-Meteo no impedirá registrarla.

## Datos y asociación

| Dato | Variable de Open-Meteo | Unidad |
| --- | --- | --- |
| Lluvia | `rain` | mm |
| Partículas finas | `pm2_5` | µg/m³ |
| Partículas | `pm10` | µg/m³ |
| Dióxido de nitrógeno | `nitrogen_dioxide` | µg/m³ |

Se consultarán las coordenadas WGS84 de la incidencia y se asociará a cada variable la hora UTC más reciente que no sea posterior a `registeredAt`. Para la lluvia, la marca horaria representa el total de la hora anterior; para los contaminantes, el valor corresponde a la hora indicada. Por ejemplo, para una incidencia registrada a las 14:32 UTC se usaría la marca de las 14:00 UTC. Cada dato conservará su fuente, unidad, hora de referencia, fecha de consulta y coordenadas solicitadas y devueltas por la API.

Los datos se vincularán a la incidencia mediante el contexto urbano existente (`WEATHER` para lluvia y `ENVIRONMENT` para aire). Cada variable podrá estar `PENDING`, `AVAILABLE`, `NO_DATA` o `SOURCE_ERROR`; la falta de una no ocultará las demás. Esta tarea define el contrato, sin implementar todavía la consulta ni los reintentos.

## Cobertura y uso

La [API meteorológica](https://open-meteo.com/en/docs) ofrece lluvia horaria por coordenadas. 
La [API de calidad del aire](https://open-meteo.com/en/docs/air-quality-api) utiliza para Málaga el dominio europeo CAMS, con resolución aproximada de 11 km y datos horarios. 
La cobertura efectiva y los valores disponibles se comprobarán en cada respuesta.

La [API gratuita](https://open-meteo.com/en/terms) permite solo uso no comercial, exige atribución y limita el acceso a menos de 10.000 llamadas al día, 5.000 por hora y 600 por minuto. Antes de activarla debe confirmarse que el uso previsto cumple estas condiciones. La interfaz deberá atribuir los datos a Open-Meteo y, para calidad del aire, a CAMS ENSEMBLE.
