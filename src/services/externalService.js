const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const WeatherSnapshot = require('../models/weatherSnapshot');
const { openMeteoBaseUrl, meteoalarmFeedUrl } = require('../config');

function normalizeAlertLevel(text = '') {
  const v = text.toLowerCase();
  if (v.includes('extreme') || v.includes('red')) return 'extreme';
  if (v.includes('high') || v.includes('orange')) return 'high';
  if (v.includes('moderate') || v.includes('yellow')) return 'moderate';
  if (v.includes('low') || v.includes('green')) return 'low';
  return 'none';
}

function computeRisk(load = 50, alert = 'none') {
  let score = load;
  if (['high', 'extreme'].includes(alert)) score += 20;
  if (alert === 'moderate') score += 10;
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

async function latestCached(lat, lon, countryCode) {
  return WeatherSnapshot.findOne({ 'location.countryCode': countryCode, source: { $in: ['open-meteo', 'meteoalarm'] } })
    .sort({ snapshotDate: -1 })
    .lean();
}

async function fetchWeatherJson(lat, lon, sessionDate, countryCode) {
  try {
    const date = new Date(sessionDate).toISOString().slice(0, 10);
    const { data } = await axios.get(openMeteoBaseUrl, {
      timeout: 10000,
      params: {
        latitude: lat,
        longitude: lon,
        hourly: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
        timezone: 'UTC',
        start_date: date,
        end_date: date
      }
    });

    const idx = 0;
    const snapshot = await WeatherSnapshot.create({
      source: 'open-meteo',
      snapshotDate: new Date(sessionDate),
      location: { lat, lon, countryCode },
      temperatureC: data?.hourly?.temperature_2m?.[idx] ?? null,
      humidity: data?.hourly?.relative_humidity_2m?.[idx] ?? null,
      windSpeedKmh: data?.hourly?.wind_speed_10m?.[idx] ?? null,
      precipitationMm: data?.hourly?.precipitation?.[idx] ?? null,
      rawPayload: data
    });

    return { status: 'ok', snapshot, alertLevel: 'none' };
  } catch (error) {
    const cached = await latestCached(lat, lon, countryCode);
    if (cached) return { status: 'cached', snapshot: cached, alertLevel: cached.alertLevel || 'none' };
    return { status: 'unavailable', snapshot: null, alertLevel: 'none' };
  }
}

async function fetchAlertsXml(countryCode = 'ES') {
  try {
    const { data } = await axios.get(meteoalarmFeedUrl, { timeout: 10000, responseType: 'text' });
    const parsed = await parseStringPromise(data, { explicitArray: false, trim: true });
    const feedEntries = parsed?.feed?.entry;
    const entries = Array.isArray(feedEntries) ? feedEntries : feedEntries ? [feedEntries] : [];
    const matched = entries.filter((e) => JSON.stringify(e).toUpperCase().includes(countryCode.toUpperCase()));
    const textBlob = JSON.stringify(matched.length ? matched : entries).slice(0, 5000);
    const alertLevel = normalizeAlertLevel(textBlob);

    const snapshot = await WeatherSnapshot.create({
      source: 'meteoalarm',
      snapshotDate: new Date(),
      location: { countryCode },
      alertLevel,
      rawPayload: matched.length ? matched : entries
    });

    return { status: 'ok', alertLevel, snapshot };
  } catch (error) {
    const cached = await WeatherSnapshot.findOne({ source: 'meteoalarm', 'location.countryCode': countryCode })
      .sort({ snapshotDate: -1 })
      .lean();
    if (cached) return { status: 'cached', alertLevel: cached.alertLevel || 'none', snapshot: cached };
    return { status: 'unavailable', alertLevel: 'none', snapshot: null };
  }
}

module.exports = { fetchWeatherJson, fetchAlertsXml, computeRisk };
