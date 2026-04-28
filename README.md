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


## Entrega final - Implementación

Se ha implementado una API REST completa en `src/` con MongoDB y soporte de mensajes JSON/XML.

### Estructura principal

- `src/server.js` y `src/app.js`: arranque y definición de rutas
- `src/models/`: modelos Mongoose (`athlete`, `session`, `injury`, `weatherSnapshot`)
- `src/services/externalService.js`: integración APIs externas JSON/XML + fallback cacheado
- `src/utils/xml.js`: parseo y serialización XML
- `scripts/generate-datasets.js`: transforma el CSV real (`archive (1)/multimodal_sports_injury_dataset.csv`) a datasets JSON
- `scripts/seed.js`: carga datasets en MongoDB
- `data/`: datasets derivados del CSV real (`training_sessions.json` incluye 15,420 documentos)

### Requisitos

- Node.js 18+
- MongoDB en ejecución (local o remoto)

### Configuración

1. Copia el archivo de entorno:

```bash
cp .env.example .env
```

2. Ajusta `MONGO_URI` en `.env` si procede.

### Instalación y ejecución

```bash
npm install
npm run generate
npm run seed
npm start
```

### Scripts npm

- `npm run start`: inicia la API
- `npm run dev`: inicia en modo watch
- `npm run generate`: genera datasets JSON
- `npm run seed`: inserta datasets en MongoDB

### Endpoints base

Base URL: `http://localhost:3000/api/v1`

- CRUD atletas: `/athletes`
- CRUD sesiones: `/sessions` (con paginación `page/limit` y filtros `athleteId`, `riskLevel`, `weatherAlertLevel`, `from`, `to`)
- CRUD lesiones: `/injuries`
- Integración externa: `/external/weather/refresh`, `/external/alerts/refresh`, `/external/status`
- Salud: `/health`

### XML y schema

- Soporte XML en rutas seleccionadas de atletas/lesiones mediante `Content-Type`/`Accept: application/xml`
- Schema XML asociado: `documentacion/athlete.xsd`

### APIs externas usadas

- JSON: Open-Meteo (`OPEN_METEO_BASE_URL`)
- XML: Meteoalarm CAP feed (`METEOALARM_FEED_URL`)

Si una API externa falla, el servicio usa snapshots cacheados o marca `externalDataStatus=unavailable` sin bloquear el CRUD principal.

## Dataset real utilizado

Se utiliza el dataset real incluido en `archive (1)/multimodal_sports_injury_dataset.csv` (15,420 muestras, 156 atletas).

El script `npm run generate` transforma este CSV en:
- `data/athletes.json`
- `data/training_sessions.json`
- `data/injuries.json`

Después, `npm run seed` carga esos JSON en MongoDB.

