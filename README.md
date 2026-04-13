# SWII-Lesiones_deportivas

## Miembros del grupo

- Pablo de la Cruz
- Enrique Muñoz
- Santiago Battat
- Alberto Fernández
- Victor Martínez
- Miguel Barrera

## Temática del proyecto

Nuestra API trata sobre la gestión y análisis del **riesgo de lesiones deportivas**.

El sistema almacena información de deportistas, sesiones de entrenamiento y lesiones, e integra datos externos (por ejemplo, de clima) para enriquecer el contexto de cada sesión y facilitar el análisis del riesgo de lesión.

## Entrega 2 - Diseño del servicio

La fase de diseño para la Entrega 2 está en la carpeta `documentacion/`:

- `documentacion/diseno-interfaz-rest.md` (diseño REST + ejemplos JSON/XML)
- `documentacion/modelo-datos.md` (modelo de datos MongoDB)
- `documentacion/openapi.yaml` (especificación OpenAPI 3.0.3)

## Stack y tecnologías objetivo

- **Backend:** Node.js + Express
- **Base de datos:** MongoDB
- **Formato de intercambio:** JSON y XML

## APIs externas seleccionadas

- **JSON:** Open-Meteo API (meteorología para enriquecer sesiones)
- **XML:** Meteoalarm CAP Feed (alertas meteorológicas en XML)

La integración está diseñada para que la API principal siga funcionando si una fuente externa no está disponible (uso de snapshots cacheados en MongoDB).

