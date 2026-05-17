# SWII-Lesiones_deportivas

API REST para gestión y análisis del **riesgo de lesiones deportivas**. Almacena deportistas, sesiones de entrenamiento y lesiones, e integra datos meteorológicos externos (JSON + XML) para enriquecer el contexto de cada sesión.

## Miembros del grupo

- Pablo de la Cruz
- Enrique Muñoz
- Santiago Battat
- Alberto Fernández
- Victor Martínez
- Miguel Barrera

## Stack

- **Backend:** Node.js 18+ con Express 5
- **Base de datos:** MongoDB (Mongoose)
- **Formatos:** JSON y XML

## Requisitos previos

- **Node.js >= 18**.
- **MongoDB** corriendo y accesible. Opciones rápidas:
  - Instalación local: <https://www.mongodb.com/try/download/community>.
  - Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`.
  - Atlas (cloud): crear cluster gratuito y poner la cadena en `MONGO_URI`.

No hace falta ninguna API key para las APIs externas (Open-Meteo y Meteoalarm son públicas).

## Configuración

1. Copia el archivo de entorno y ajusta `MONGO_URI` si procede:

```bash
cp .env.example .env
```

2. Variables disponibles (todas con valor por defecto razonable):
   - `PORT` — puerto del servidor (3000).
   - `MONGO_URI` — `mongodb://localhost:27017/swii_lesiones`.
   - `OPEN_METEO_BASE_URL` — endpoint JSON de Open-Meteo.
   - `METEOALARM_FEED_URL` — feed XML CAP de Meteoalarm.

## Instalación y ejecución

```bash
npm install
npm run seed      # carga los datasets ya generados (data/*.json) en MongoDB
npm start
```

Si quieres regenerar los datasets desde el CSV original (`archive/multimodal_sports_injury_dataset.csv`), antes del seed ejecuta:

```bash
npm run generate
```

## Scripts npm

- `npm start` — inicia la API en el puerto configurado.
- `npm run dev` — inicia en modo watch (Node `--watch`).
- `npm run generate` — regenera `data/*.json` desde el CSV.
- `npm run seed` — carga `data/*.json` en MongoDB (borra colecciones previas).

## Endpoints

Base URL: `http://localhost:3000/api/v1`. Detalle completo en [`documentacion/openapi.yaml`](documentacion/openapi.yaml).

### CRUD plano
- `/athletes` — atletas.
- `/sessions` — sesiones (paginado `?page&limit` y filtros `?athleteId&riskLevel&weatherAlertLevel&from&to`).
- `/injuries` — lesiones (filtros `?athleteId&sessionId`).

### Rutas anidadas (relaciones explícitas)
- `GET/POST /athletes/{athleteId}/sessions`
- `GET/POST /athletes/{athleteId}/injuries`
- `GET /sessions/{sessionId}/injuries`

### Integración externa
- `POST /external/weather/refresh` — fuerza fetch JSON (Open-Meteo).
- `POST /external/alerts/refresh` — fuerza fetch XML (Meteoalarm CAP).
- `GET /external/status` — estado de las fuentes externas.

### Otros
- `GET /health` — liveness probe.

## XML y schemas

Soporte de `Content-Type` / `Accept: application/xml` en `POST /athletes`, `GET /athletes/{id}`, `POST /injuries` y `POST /athletes/{id}/injuries`. Schemas asociados:
- [`documentacion/athlete.xsd`](documentacion/athlete.xsd)
- [`documentacion/injury.xsd`](documentacion/injury.xsd)

## APIs externas

| Fuente | Formato | URL por defecto | API key |
| --- | --- | --- | --- |
| Open-Meteo | JSON | <https://api.open-meteo.com/v1/forecast> | No |
| Meteoalarm CAP feed | XML | <https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom.xml> | No |

Si una fuente externa cae, el servicio usa el último snapshot cacheado en MongoDB y marca `externalDataStatus = "cached"`; si tampoco hay cache, marca `unavailable` sin bloquear el CRUD.

## Dataset y volumen

Se usa el dataset real `archive/multimodal_sports_injury_dataset.csv` (15.420 muestras, 156 atletas). El seed produce:

- `data/athletes.json` (156 documentos)
- `data/training_sessions.json` (**15.420 documentos** → cumple el requisito de colección masiva)
- `data/injuries.json`

## Pruebas rápidas con curl

Tras `npm run seed && npm start`:

```bash
# Health
curl http://localhost:3000/api/v1/health

# Listar primera página de sesiones
curl "http://localhost:3000/api/v1/sessions?page=1&limit=5"

# Obtener un atleta y sus sesiones (relación anidada)
ATHLETE=$(curl -s http://localhost:3000/api/v1/athletes | jq -r '.[0]._id')
curl "http://localhost:3000/api/v1/athletes/$ATHLETE/sessions?limit=3"

# Crear una lesión asociada al atleta (sin athleteId en body, va en URL)
curl -X POST "http://localhost:3000/api/v1/athletes/$ATHLETE/injuries" \
  -H "Content-Type: application/json" \
  -d '{"injuryDate":"2026-05-17T10:00:00Z","injuryType":"muscular","bodyPart":"hamstring","severity":"mild"}'

# Crear un atleta en XML
curl -X POST http://localhost:3000/api/v1/athletes \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  -d '<Athlete><fullName>Test</fullName><birthDate>2000-01-01</birthDate><sex>female</sex><primarySport>running</primarySport></Athlete>'
```

## Documentación

- [`documentacion/openapi.yaml`](documentacion/openapi.yaml) — OpenAPI 3.0.3 completo (relaciones, ejemplos, rutas anidadas).
- [`documentacion/diseno-interfaz-rest.md`](documentacion/diseno-interfaz-rest.md) — diseño REST.
- [`documentacion/modelo-datos.md`](documentacion/modelo-datos.md) — modelo de datos MongoDB.
- [`documentacion/athlete.xsd`](documentacion/athlete.xsd) / [`documentacion/injury.xsd`](documentacion/injury.xsd) — schemas XML.
