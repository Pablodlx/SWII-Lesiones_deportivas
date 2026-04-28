const express = require('express');
const Athlete = require('./models/athlete');
const TrainingSession = require('./models/session');
const Injury = require('./models/injury');
const { parseXmlBody, asXml } = require('./utils/xml');
const { fetchWeatherJson, fetchAlertsXml, computeRisk } = require('./services/externalService');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '1mb' }));

function respond(req, res, root, payload, status = 200) {
  const accept = req.headers.accept || '';
  const wantsXml = accept.includes('application/xml') && !accept.includes('text/html');
  if (wantsXml) {
    const normalized = JSON.parse(JSON.stringify(payload));
    const xml = asXml(root, normalized);
    return res.status(status).type('application/xml').send(xml);
  }
  return res.status(status).json(payload);
}

async function parseBody(req) {
  if ((req.headers['content-type'] || '').includes('xml')) {
    return parseXmlBody(req.body || '<root/>');
  }
  return req.body;
}

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

app.get('/api/v1/health', (req, res) => res.json({ ok: true }));

app.post('/api/v1/athletes', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const created = await Athlete.create(payload);
  respond(req, res, 'Athlete', created.toObject(), 201);
}));

app.get('/api/v1/athletes', wrap(async (req, res) => {
  const items = await Athlete.find().sort({ createdAt: -1 }).lean();
  respond(req, res, 'Athletes', { athlete: items });
}));

app.get('/api/v1/athletes/:id', wrap(async (req, res) => {
  const item = await Athlete.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Athlete not found' });
  respond(req, res, 'Athlete', item);
}));

app.put('/api/v1/athletes/:id', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const item = await Athlete.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Athlete not found' });
  respond(req, res, 'Athlete', item);
}));

app.delete('/api/v1/athletes/:id', wrap(async (req, res) => {
  const deleted = await Athlete.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', message: 'Athlete not found' });
  res.status(204).send();
}));

app.post('/api/v1/sessions', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const { location = {}, load = 50 } = payload;
  const weather = await fetchWeatherJson(location.lat, location.lon, payload.sessionDate, location.countryCode);
  const alerts = await fetchAlertsXml(location.countryCode || 'ES');
  const riskLevel = computeRisk(load, alerts.alertLevel);
  const externalDataStatus = weather.status === 'ok' && alerts.status === 'ok'
    ? 'ok'
    : weather.status === 'cached' || alerts.status === 'cached'
      ? 'cached'
      : 'unavailable';

  const created = await TrainingSession.create({
    ...payload,
    weatherSnapshotId: weather.snapshot?._id,
    weatherAlertLevel: alerts.alertLevel,
    riskLevel,
    externalDataStatus
  });

  respond(req, res, 'TrainingSession', created.toObject(), 201);
}));

app.get('/api/v1/sessions', wrap(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const filter = {};
  if (req.query.athleteId) filter.athleteId = req.query.athleteId;
  if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
  if (req.query.weatherAlertLevel) filter.weatherAlertLevel = req.query.weatherAlertLevel;
  if (req.query.from || req.query.to) {
    filter.sessionDate = {};
    if (req.query.from) filter.sessionDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.sessionDate.$lte = new Date(req.query.to);
  }

  const [total, data] = await Promise.all([
    TrainingSession.countDocuments(filter),
    TrainingSession.find(filter).sort({ sessionDate: -1 }).skip((page - 1) * limit).limit(limit).lean()
  ]);

  respond(req, res, 'PaginatedSessions', { page, limit, total, totalPages: Math.ceil(total / limit), data });
}));

app.get('/api/v1/sessions/:id', wrap(async (req, res) => {
  const item = await TrainingSession.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
  respond(req, res, 'TrainingSession', item);
}));

app.put('/api/v1/sessions/:id', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const item = await TrainingSession.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
  respond(req, res, 'TrainingSession', item);
}));

app.delete('/api/v1/sessions/:id', wrap(async (req, res) => {
  const deleted = await TrainingSession.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', message: 'Session not found' });
  res.status(204).send();
}));

app.post('/api/v1/injuries', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const created = await Injury.create(payload);
  respond(req, res, 'Injury', created.toObject(), 201);
}));

app.get('/api/v1/injuries', wrap(async (req, res) => {
  const items = await Injury.find().sort({ injuryDate: -1 }).lean();
  respond(req, res, 'Injuries', { injury: items });
}));

app.get('/api/v1/injuries/:id', wrap(async (req, res) => {
  const item = await Injury.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Injury not found' });
  respond(req, res, 'Injury', item);
}));

app.put('/api/v1/injuries/:id', wrap(async (req, res) => {
  const payload = await parseBody(req);
  const item = await Injury.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Injury not found' });
  respond(req, res, 'Injury', item);
}));

app.delete('/api/v1/injuries/:id', wrap(async (req, res) => {
  const deleted = await Injury.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', message: 'Injury not found' });
  res.status(204).send();
}));

app.post('/api/v1/external/weather/refresh', wrap(async (req, res) => {
  const { lat = 40.4168, lon = -3.7038, countryCode = 'ES', sessionDate = new Date().toISOString() } = req.body || {};
  const result = await fetchWeatherJson(lat, lon, sessionDate, countryCode);
  if (result.status === 'unavailable') return res.status(503).json({ code: 'EXTERNAL_UNAVAILABLE', message: 'Weather source unavailable' });
  res.json({ source: 'open-meteo', status: result.status, processedRecords: 1, syncedAt: new Date().toISOString() });
}));

app.post('/api/v1/external/alerts/refresh', wrap(async (req, res) => {
  const { countryCode = 'ES' } = req.body || {};
  const result = await fetchAlertsXml(countryCode);
  if (result.status === 'unavailable') return res.status(503).json({ code: 'EXTERNAL_UNAVAILABLE', message: 'XML alerts source unavailable' });
  res.json({ source: 'meteoalarm', status: result.status, processedRecords: 1, syncedAt: new Date().toISOString() });
}));

app.get('/api/v1/external/status', async (req, res) => {
  const weather = await fetchWeatherJson(40.4168, -3.7038, new Date().toISOString(), 'ES');
  const alerts = await fetchAlertsXml('ES');
  res.json({
    weatherJson: weather.status === 'ok' ? 'ok' : weather.status === 'cached' ? 'degraded' : 'unavailable',
    alertsXml: alerts.status === 'ok' ? 'ok' : alerts.status === 'cached' ? 'degraded' : 'unavailable',
    lastSyncAt: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ code: 'BAD_REQUEST', message: err.message });
  }
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: err.message });
});

module.exports = app;
