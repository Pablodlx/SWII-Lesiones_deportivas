# Diseño de la interfaz REST - API de Riesgo de Lesiones Deportivas

## 1. Objetivo
Diseñar una API REST en Node.js + MongoDB para gestionar deportistas, sesiones de entrenamiento y lesiones, integrando datos externos de clima para enriquecer el análisis de riesgo.

## 2. Recursos principales y relaciones
Se definen 4 colecciones en MongoDB:
- `athletes` (deportistas)
- `training_sessions` (sesiones)
- `injuries` (lesiones)
- `external_weather_snapshots` (clima externo cacheado)

Relaciones (modelo lógico):

```
Athlete  1 ─── N  TrainingSession
   │
   └── 1 ─── N  Injury
                  │
                  └── 0..1  TrainingSession
```

- Un `athlete` tiene muchas `training_sessions` (FK `athleteId` en sesión).
- Un `athlete` tiene muchas `injuries` (FK `athleteId` en lesión).
- Una `injury` puede asociarse opcionalmente a una `training_session` (FK `sessionId`, nullable) si ocurrió durante esa sesión.
- Una `training_session` referencia un `weather_snapshot` externo (FK `weatherSnapshotId`).

Las relaciones se navegan en la API por dos vías:
1. **Por filtro**: `GET /sessions?athleteId=...`, `GET /injuries?athleteId=...`, `GET /injuries?sessionId=...`.
2. **Por rutas anidadas** (ver §5.5): `GET /athletes/{athleteId}/sessions`, `GET /athletes/{athleteId}/injuries`, `GET /sessions/{sessionId}/injuries`.

## 3. APIs externas seleccionadas
### API externa JSON
- **Open-Meteo API** (JSON): datos meteorológicos por lat/lon para fecha/hora de sesión.
- Uso: enriquecer sesión con temperatura, humedad, viento y precipitación.

### API externa XML
- **Meteoalarm CAP Feed** (XML): alertas meteorológicas europeas en formato XML/CAP.
- Uso: etiquetar sesiones con nivel de alerta meteorológica por zona.

## 4. Estrategia de resiliencia ante caída de API externa
Si una API externa no está disponible:
1. Se usa el último `weather_snapshot` guardado en MongoDB para la misma zona/rango temporal.
2. Si no existe snapshot válido, se guarda la sesión sin enriquecimiento externo y con `externalDataStatus = "unavailable"`.
3. El servicio principal sigue respondiendo sin bloquear operaciones CRUD.

## 5. Endpoints REST diseñados
Base URL: `/api/v1`

### 5.1 Athletes
- `POST /athletes`
- `GET /athletes`
- `GET /athletes/{athleteId}`
- `PUT /athletes/{athleteId}`
- `DELETE /athletes/{athleteId}`

### 5.2 Training Sessions
- `POST /sessions`
- `GET /sessions` (con paginación y filtros)
- `GET /sessions/{sessionId}`
- `PUT /sessions/{sessionId}`
- `DELETE /sessions/{sessionId}`

Filtros y paginación en `GET /sessions`:
- `page`, `limit`
- `athleteId`
- `riskLevel`
- `from`, `to` (rango de fechas)
- `weatherAlertLevel`

### 5.3 Injuries
- `POST /injuries`
- `GET /injuries`
- `GET /injuries/{injuryId}`
- `PUT /injuries/{injuryId}`
- `DELETE /injuries/{injuryId}`

### 5.4 Integración externa
- `POST /external/weather/refresh` (actualiza snapshot JSON)
- `POST /external/alerts/refresh` (actualiza alertas XML)
- `GET /external/status`

### 5.5 Rutas anidadas (relaciones explícitas)
Hacen explícita en la URL la relación entre recursos, complementando las rutas planas:
- `GET /athletes/{athleteId}/sessions` — sesiones del atleta (paginadas, mismos filtros que `/sessions`).
- `POST /athletes/{athleteId}/sessions` — crear sesión asociada al atleta (no hace falta `athleteId` en el body).
- `GET /athletes/{athleteId}/injuries` — lesiones del atleta.
- `POST /athletes/{athleteId}/injuries` — crear lesión asociada al atleta (no hace falta `athleteId` en el body; `sessionId` sigue opcional).
- `GET /sessions/{sessionId}/injuries` — lesiones asociadas a una sesión.

### 5.6 Otros
- `GET /health` — liveness probe.

## 6. Formatos de mensajes
- Formato por defecto: `application/json`.
- También se soporta `application/xml` en endpoints seleccionados (`POST /athletes`, `GET /athletes/{athleteId}`, `POST /injuries`, `POST /athletes/{athleteId}/injuries`), con esquemas XML asociados:
  - `documentacion/athlete.xsd`
  - `documentacion/injury.xsd`

## 7. Ejemplos de mensajes
### 7.1 Ejemplo JSON (POST /sessions)
```json
{
  "athleteId": "661a0f2c2ef4aa0012c7a911",
  "sport": "running",
  "sessionDate": "2026-03-24T18:30:00Z",
  "durationMinutes": 75,
  "load": 82,
  "surface": "asphalt",
  "location": {
    "name": "Parque del Retiro",
    "lat": 40.4153,
    "lon": -3.6844,
    "countryCode": "ES"
  }
}
```

### 7.2 Ejemplo XML (POST /athletes)
```xml
<Athlete>
  <fullName>Laura Martínez</fullName>
  <birthDate>1998-09-04</birthDate>
  <sex>female</sex>
  <heightCm>168</heightCm>
  <weightKg>58.4</weightKg>
  <primarySport>running</primarySport>
  <team>Club Norte</team>
</Athlete>
```

## 8. Códigos de estado
- `200 OK`, `201 Created`, `204 No Content`
- `400 Bad Request`, `404 Not Found`, `409 Conflict`
- `415 Unsupported Media Type`
- `500 Internal Server Error`, `503 Service Unavailable`

## 9. Requisito de colección masiva (>=1000 documentos)
La colección `training_sessions` será la colección masiva.
- Se incluirá dataset JSON para cargar al menos 1000 sesiones.
- Se define paginación y filtrado en `GET /sessions`.
- Se incluirá script npm de carga en la entrega final de implementación.
