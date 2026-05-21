window.API_BASE = '/api/v1';

window.ENDPOINTS = [
  {
    id: 'health',
    group: 'Health',
    method: 'GET',
    path: '/health',
    summary: 'Liveness probe',
    description: 'Comprueba que la API responde. No requiere MongoDB para devolver 200.',
    needsParams: false
  },

  {
    id: 'athletes-list',
    group: 'Athletes',
    method: 'GET',
    path: '/athletes',
    summary: 'Listar atletas',
    description: 'Devuelve todos los atletas ordenados por fecha de creación descendente.',
    needsParams: false
  },
  {
    id: 'athletes-create',
    group: 'Athletes',
    method: 'POST',
    path: '/athletes',
    summary: 'Crear atleta',
    description: 'Crea un nuevo atleta. Acepta JSON o XML según Content-Type.',
    examplePayload: {
      fullName: 'Demo Aurora',
      birthDate: '1998-09-04',
      sex: 'female',
      heightCm: 168,
      weightKg: 58.4,
      primarySport: 'running',
      team: 'Aurora UI Demo'
    }
  },
  {
    id: 'athletes-get',
    group: 'Athletes',
    method: 'GET',
    path: '/athletes/:id',
    summary: 'Obtener un atleta',
    description: 'Devuelve un atleta por su _id de MongoDB.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }]
  },
  {
    id: 'athletes-update',
    group: 'Athletes',
    method: 'PUT',
    path: '/athletes/:id',
    summary: 'Actualizar atleta',
    description: 'Actualiza campos de un atleta. Validación de Mongoose activada.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }],
    examplePayload: {
      team: 'Aurora UI Demo (updated)',
      weightKg: 60.0
    }
  },
  {
    id: 'athletes-delete',
    group: 'Athletes',
    method: 'DELETE',
    path: '/athletes/:id',
    summary: 'Eliminar atleta',
    description: 'Elimina un atleta. Responde 204 sin cuerpo si se borra correctamente.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId del atleta', resolver: 'lastCreatedAthleteId' }]
  },

  {
    id: 'athletes-sessions-list',
    group: 'Athletes',
    method: 'GET',
    path: '/athletes/:athleteId/sessions',
    summary: 'Sesiones de un atleta',
    description: 'Lista paginada de sesiones de un atleta. Acepta ?page, ?limit, ?riskLevel, ?weatherAlertLevel, ?from, ?to.',
    pathParams: [{ name: 'athleteId', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }],
    queryParams: [
      { name: 'page', value: '1' },
      { name: 'limit', value: '5' }
    ]
  },
  {
    id: 'athletes-sessions-create',
    group: 'Athletes',
    method: 'POST',
    path: '/athletes/:athleteId/sessions',
    summary: 'Crear sesión de un atleta',
    description: 'Crea una sesión asociada al atleta. La API enriquece con clima (Open-Meteo) y alertas (Meteoalarm) y calcula riskLevel.',
    pathParams: [{ name: 'athleteId', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }],
    examplePayload: {
      sport: 'running',
      sessionDate: '2026-03-24T18:30:00Z',
      durationMinutes: 75,
      load: 82,
      surface: 'asphalt',
      location: { name: 'Parque del Retiro', lat: 40.4153, lon: -3.6844, countryCode: 'ES' }
    }
  },
  {
    id: 'athletes-injuries-list',
    group: 'Athletes',
    method: 'GET',
    path: '/athletes/:athleteId/injuries',
    summary: 'Lesiones de un atleta',
    description: 'Lista de lesiones de un atleta, ordenadas por fecha descendente.',
    pathParams: [{ name: 'athleteId', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }]
  },
  {
    id: 'athletes-injuries-create',
    group: 'Athletes',
    method: 'POST',
    path: '/athletes/:athleteId/injuries',
    summary: 'Crear lesión de un atleta',
    description: 'Crea una lesión asociada al atleta. athleteId va en la URL, no en el body.',
    pathParams: [{ name: 'athleteId', placeholder: 'ObjectId del atleta', resolver: 'firstAthleteId' }],
    examplePayload: {
      injuryDate: '2026-05-17T10:00:00Z',
      injuryType: 'muscular',
      bodyPart: 'hamstring',
      severity: 'mild',
      daysOut: 7,
      notes: 'Creada desde la UI Aurora'
    }
  },

  {
    id: 'sessions-list',
    group: 'Sessions',
    method: 'GET',
    path: '/sessions',
    summary: 'Listar sesiones (paginado)',
    description: 'Listado con paginación y filtros opcionales.',
    queryParams: [
      { name: 'page', value: '1' },
      { name: 'limit', value: '5' }
    ]
  },
  {
    id: 'sessions-create',
    group: 'Sessions',
    method: 'POST',
    path: '/sessions',
    summary: 'Crear sesión (enriquecida)',
    description: 'Crea una sesión global; necesita athleteId en el body. Enriquece con clima y calcula riskLevel.',
    examplePayload: {
      athleteId: '__REPLACE_WITH_ATHLETE_ID__',
      sport: 'running',
      sessionDate: '2026-03-24T18:30:00Z',
      durationMinutes: 60,
      load: 70,
      surface: 'asphalt',
      location: { name: 'Madrid Río', lat: 40.4168, lon: -3.7038, countryCode: 'ES' }
    },
    payloadTransform: 'injectAthleteId'
  },
  {
    id: 'sessions-get',
    group: 'Sessions',
    method: 'GET',
    path: '/sessions/:id',
    summary: 'Obtener sesión',
    description: 'Devuelve una sesión por su _id.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la sesión', resolver: 'firstSessionId' }]
  },
  {
    id: 'sessions-update',
    group: 'Sessions',
    method: 'PUT',
    path: '/sessions/:id',
    summary: 'Actualizar sesión',
    description: 'Actualización parcial o total de una sesión.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la sesión', resolver: 'firstSessionId' }],
    examplePayload: {
      load: 90,
      durationMinutes: 90
    }
  },
  {
    id: 'sessions-delete',
    group: 'Sessions',
    method: 'DELETE',
    path: '/sessions/:id',
    summary: 'Eliminar sesión',
    description: 'Elimina una sesión por _id.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la sesión', resolver: 'lastCreatedSessionId' }]
  },
  {
    id: 'sessions-injuries-list',
    group: 'Sessions',
    method: 'GET',
    path: '/sessions/:sessionId/injuries',
    summary: 'Lesiones de una sesión',
    description: 'Lista de lesiones vinculadas a una sesión concreta.',
    pathParams: [{ name: 'sessionId', placeholder: 'ObjectId de la sesión', resolver: 'firstSessionId' }]
  },

  {
    id: 'injuries-list',
    group: 'Injuries',
    method: 'GET',
    path: '/injuries',
    summary: 'Listar lesiones',
    description: 'Acepta ?athleteId y ?sessionId como filtros opcionales.',
    queryParams: []
  },
  {
    id: 'injuries-create',
    group: 'Injuries',
    method: 'POST',
    path: '/injuries',
    summary: 'Crear lesión',
    description: 'Crea una lesión global. athleteId va en el body (a diferencia de la versión anidada).',
    examplePayload: {
      athleteId: '__REPLACE_WITH_ATHLETE_ID__',
      injuryDate: '2026-05-17T10:00:00Z',
      injuryType: 'acute-injury',
      bodyPart: 'knee',
      severity: 'moderate',
      daysOut: 21
    },
    payloadTransform: 'injectAthleteId'
  },
  {
    id: 'injuries-get',
    group: 'Injuries',
    method: 'GET',
    path: '/injuries/:id',
    summary: 'Obtener lesión',
    description: 'Devuelve una lesión por _id.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la lesión', resolver: 'firstInjuryId' }]
  },
  {
    id: 'injuries-update',
    group: 'Injuries',
    method: 'PUT',
    path: '/injuries/:id',
    summary: 'Actualizar lesión',
    description: 'Actualización parcial de una lesión.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la lesión', resolver: 'firstInjuryId' }],
    examplePayload: {
      severity: 'severe',
      daysOut: 30
    }
  },
  {
    id: 'injuries-delete',
    group: 'Injuries',
    method: 'DELETE',
    path: '/injuries/:id',
    summary: 'Eliminar lesión',
    description: 'Elimina una lesión por _id.',
    pathParams: [{ name: 'id', placeholder: 'ObjectId de la lesión', resolver: 'lastCreatedInjuryId' }]
  },

  {
    id: 'external-weather',
    group: 'External',
    method: 'POST',
    path: '/external/weather/refresh',
    summary: 'Refrescar clima (JSON)',
    description: 'Fuerza un fetch a Open-Meteo. Si la fuente cae devuelve 503; si hay cache responde 200 con status=cached.',
    examplePayload: {
      lat: 40.4168,
      lon: -3.7038,
      countryCode: 'ES',
      sessionDate: '2026-03-24T18:30:00Z'
    }
  },
  {
    id: 'external-alerts',
    group: 'External',
    method: 'POST',
    path: '/external/alerts/refresh',
    summary: 'Refrescar alertas (XML)',
    description: 'Fuerza un fetch al feed CAP de Meteoalarm (XML). Mismo patrón de fallback que el JSON.',
    examplePayload: {
      countryCode: 'ES'
    }
  },
  {
    id: 'external-status',
    group: 'External',
    method: 'GET',
    path: '/external/status',
    summary: 'Estado de las fuentes externas',
    description: 'Resumen de salud de Open-Meteo y Meteoalarm (ok / degraded / unavailable).'
  }
];

window.GROUP_META = {
  Health: { label: 'Health', accent: 'mint' },
  Athletes: { label: 'Athletes', accent: 'pink' },
  Sessions: { label: 'Sessions', accent: 'violet' },
  Injuries: { label: 'Injuries', accent: 'cyan' },
  External: { label: 'External', accent: 'amber' }
};
