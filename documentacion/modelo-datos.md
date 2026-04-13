# Modelo de datos MongoDB - API de Riesgo de Lesiones Deportivas

## Colecciones

## 1) athletes
```json
{
  "_id": "ObjectId",
  "fullName": "string",
  "birthDate": "date",
  "sex": "male|female|other",
  "heightCm": "number",
  "weightKg": "number",
  "primarySport": "string",
  "team": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

Índices recomendados:
- `{ fullName: 1 }`
- `{ primarySport: 1 }`

## 2) training_sessions
```json
{
  "_id": "ObjectId",
  "athleteId": "ObjectId (ref athletes)",
  "sport": "string",
  "sessionDate": "date",
  "durationMinutes": "number",
  "load": "number (0-100)",
  "surface": "string",
  "location": {
    "name": "string",
    "lat": "number",
    "lon": "number",
    "countryCode": "string"
  },
  "weatherSnapshotId": "ObjectId (ref external_weather_snapshots)",
  "weatherAlertLevel": "none|low|moderate|high|extreme",
  "riskLevel": "low|medium|high",
  "externalDataStatus": "ok|cached|unavailable",
  "createdAt": "date",
  "updatedAt": "date"
}
```

Índices recomendados:
- `{ athleteId: 1, sessionDate: -1 }`
- `{ riskLevel: 1 }`
- `{ weatherAlertLevel: 1 }`
- `{ sessionDate: -1 }`

## 3) injuries
```json
{
  "_id": "ObjectId",
  "athleteId": "ObjectId (ref athletes)",
  "sessionId": "ObjectId (ref training_sessions, nullable)",
  "injuryDate": "date",
  "injuryType": "string",
  "bodyPart": "string",
  "severity": "mild|moderate|severe",
  "daysOut": "number",
  "notes": "string",
  "createdAt": "date",
  "updatedAt": "date"
}
```

Índices recomendados:
- `{ athleteId: 1, injuryDate: -1 }`
- `{ injuryType: 1 }`
- `{ severity: 1 }`

## 4) external_weather_snapshots
```json
{
  "_id": "ObjectId",
  "source": "open-meteo|meteoalarm",
  "snapshotDate": "date",
  "location": {
    "lat": "number",
    "lon": "number",
    "countryCode": "string"
  },
  "temperatureC": "number",
  "humidity": "number",
  "windSpeedKmh": "number",
  "precipitationMm": "number",
  "alertLevel": "none|low|moderate|high|extreme",
  "rawPayload": "object|string",
  "createdAt": "date"
}
```

Índices recomendados:
- `{ source: 1, snapshotDate: -1 }`
- `{ "location.countryCode": 1, snapshotDate: -1 }`

## Relación lógica entre colecciones
- `athletes (1) -> (N) training_sessions`
- `athletes (1) -> (N) injuries`
- `training_sessions (1) -> (0..N) injuries`
- `training_sessions (N) -> (1) external_weather_snapshots` (último snapshot válido de contexto)
