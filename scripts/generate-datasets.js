const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Types } = require('mongoose');

const rootDir = path.join(__dirname, '..');
const outDir = path.join(rootDir, 'data');
const csvPath = path.join(rootDir, 'archive (1)', 'multimodal_sports_injury_dataset.csv');

function toNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mean(values, fallback = null) {
  const clean = values.filter((v) => Number.isFinite(v));
  if (!clean.length) return fallback;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function mapSex(gender) {
  if ((gender || '').toLowerCase() === 'male') return 'male';
  if ((gender || '').toLowerCase() === 'female') return 'female';
  return 'other';
}

function mapRisk(injuryOccurred) {
  if (injuryOccurred >= 2) return 'high';
  if (injuryOccurred === 1) return 'medium';
  return 'low';
}

function mapSeverity(injuryOccurred) {
  if (injuryOccurred >= 2) return 'severe';
  if (injuryOccurred === 1) return 'moderate';
  return 'mild';
}

function buildAthletes(rows) {
  const grouped = new Map();
  rows.forEach((r) => {
    const key = String(r.athlete_id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(r);
  });

  const athleteMap = new Map();
  const athletes = Array.from(grouped.entries()).map(([legacyAthleteId, athleteRows]) => {
    const id = new Types.ObjectId().toString();
    athleteMap.set(legacyAthleteId, id);

    const age = Math.round(mean(athleteRows.map((r) => toNumber(r.age)), 25));
    const bmi = mean(athleteRows.map((r) => toNumber(r.bmi)), 23);
    const heightCm = 175;
    const weightKg = Number((bmi * ((heightCm / 100) ** 2)).toFixed(1));

    return {
      _id: id,
      fullName: `Athlete ${legacyAthleteId}`,
      birthDate: new Date(new Date().getFullYear() - age, 0, 1).toISOString(),
      sex: mapSex(athleteRows[0].gender),
      heightCm,
      weightKg,
      primarySport: athleteRows[0].sport_type ? String(athleteRows[0].sport_type).toLowerCase() : 'other',
      team: `Team ${((Number(legacyAthleteId) || 1) % 12) + 1}`
    };
  });

  return { athletes, athleteMap };
}

function buildSessions(rows, athleteMap) {
  const now = Date.now();
  return rows.map((r, idx) => {
    const injuryOccurred = toNumber(r.injury_occurred, 0);
    const load = toNumber(r.training_load, 500);
    const normalizedLoad = Math.max(0, Math.min(100, Math.round(load / 18)));
    const humidity = toNumber(r.humidity, 50);
    const alert = humidity >= 80 ? 'high' : humidity >= 65 ? 'moderate' : humidity >= 50 ? 'low' : 'none';

    return {
      _id: new Types.ObjectId().toString(),
      athleteId: athleteMap.get(String(r.athlete_id)),
      legacySessionId: String(r.session_id || idx + 1),
      sport: r.sport_type ? String(r.sport_type).toLowerCase() : 'other',
      sessionDate: new Date(now - idx * 3 * 3600 * 1000).toISOString(),
      durationMinutes: Math.round(toNumber(r.training_duration, 60)),
      load: normalizedLoad,
      surface: ['grass', 'asphalt', 'track', 'indoor', 'court'][toNumber(r.playing_surface, 0) % 5],
      location: {
        name: 'Training Ground',
        lat: 40.4168,
        lon: -3.7038,
        countryCode: 'ES'
      },
      weatherAlertLevel: alert,
      riskLevel: mapRisk(injuryOccurred),
      externalDataStatus: 'cached'
    };
  });
}

function buildInjuries(rows, athleteMap, sessionsByLegacyId) {
  return rows
    .filter((r) => toNumber(r.injury_occurred, 0) > 0)
    .map((r, idx) => {
      const injuryOccurred = toNumber(r.injury_occurred, 1);
      const session = sessionsByLegacyId.get(String(r.session_id));
      return {
        _id: new Types.ObjectId().toString(),
        athleteId: athleteMap.get(String(r.athlete_id)),
        sessionId: session ? session._id : null,
        injuryDate: session ? session.sessionDate : new Date(Date.now() - idx * 86400000).toISOString(),
        injuryType: injuryOccurred >= 2 ? 'acute-injury' : 'risk-alert',
        bodyPart: toNumber(r.ground_reaction_force, 1500) > 2000 ? 'knee' : 'hamstring',
        severity: mapSeverity(injuryOccurred),
        daysOut: injuryOccurred >= 2 ? 14 : 5,
        notes: 'Derived from multimodal sports injury dataset'
      };
    });
}

function main() {
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

  const { athletes, athleteMap } = buildAthletes(rows);
  const sessions = buildSessions(rows, athleteMap);
  const sessionsByLegacyId = new Map(sessions.map((s) => [String(s.legacySessionId), s]));
  const injuries = buildInjuries(rows, athleteMap, sessionsByLegacyId);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'athletes.json'), JSON.stringify(athletes, null, 2));
  fs.writeFileSync(path.join(outDir, 'training_sessions.json'), JSON.stringify(sessions, null, 2));
  fs.writeFileSync(path.join(outDir, 'injuries.json'), JSON.stringify(injuries, null, 2));

  console.log(`Datasets generated from CSV: ${athletes.length} athletes, ${sessions.length} sessions, ${injuries.length} injuries.`);
}

main();
