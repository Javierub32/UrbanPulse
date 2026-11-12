# ADR 0007: Propuesta de evolución hacia microservicios

## Estado

Proposed.

## Contexto

El backend se representa actualmente como una única API organizada por dominios, según el [ADR 0006](0006-monolito-modular.md). El equipo ha planteado la posibilidad de evolucionar hacia llamadas a microservicios en el futuro.

## Opciones por evaluar

1. Dividir varias capacidades en servicios independientes desde una etapa inicial.
2. Mantener el monolito y reforzar sus límites internos.
3. Extraer gradualmente alguna capacidad como servicio independiente.

## Propuesta

Estudiar la separación de capacidades del backend en servicios independientes cuando existan necesidades que justifiquen el cambio. Esta propuesta no aprueba todavía una migración ni define qué componentes se extraerán, cómo se comunicarán o dónde se desplegarán.

Antes de aceptarla, el equipo debe concretar los motivos, los límites de cada servicio, la gestión de datos, la comunicación, el despliegue y el plan de transición.

## Consecuencias previstas

- La separación podría permitir evolucionar y desplegar determinadas capacidades de forma independiente.
- También introduciría comunicación de red, despliegues adicionales y mayor complejidad de observación y gestión de fallos.
- Una transición gradual podría requerir que el monolito y los nuevos servicios convivan durante un tiempo.
