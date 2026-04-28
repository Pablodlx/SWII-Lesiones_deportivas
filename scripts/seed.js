const fs = require('fs');
const path = require('path');
const { connectDb, mongoose } = require('../src/db');
const Athlete = require('../src/models/athlete');
const TrainingSession = require('../src/models/session');
const Injury = require('../src/models/injury');

const dataDir = path.join(__dirname, '..', 'data');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
}

function oid(id) {
  return new mongoose.Types.ObjectId(id);
}

async function run() {
  await connectDb();

  const athletes = readJson('athletes.json').map((a) => ({ ...a, _id: oid(a._id), birthDate: new Date(a.birthDate) }));
  const sessions = readJson('training_sessions.json').map((s) => ({
    ...s,
    _id: oid(s._id),
    athleteId: oid(s.athleteId),
    sessionDate: new Date(s.sessionDate)
  }));
  const injuries = readJson('injuries.json').map((i) => ({
    ...i,
    _id: oid(i._id),
    athleteId: oid(i.athleteId),
    sessionId: i.sessionId ? oid(i.sessionId) : null,
    injuryDate: new Date(i.injuryDate)
  }));

  await Promise.all([
    Athlete.deleteMany({}),
    TrainingSession.deleteMany({}),
    Injury.deleteMany({})
  ]);

  await Athlete.insertMany(athletes);
  await TrainingSession.insertMany(sessions);
  await Injury.insertMany(injuries);

  console.log(`Seed complete: ${athletes.length} athletes, ${sessions.length} sessions, ${injuries.length} injuries.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Seed error:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
