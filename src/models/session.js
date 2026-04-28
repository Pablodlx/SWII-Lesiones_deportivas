const { mongoose } = require('../db');

const sessionSchema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    sport: { type: String, required: true },
    sessionDate: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    load: { type: Number, min: 0, max: 100, default: 50 },
    surface: String,
    location: {
      name: String,
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
      countryCode: { type: String, required: true }
    },
    weatherSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeatherSnapshot' },
    weatherAlertLevel: { type: String, enum: ['none', 'low', 'moderate', 'high', 'extreme'], default: 'none' },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    externalDataStatus: { type: String, enum: ['ok', 'cached', 'unavailable'], default: 'unavailable' }
  },
  { timestamps: true, versionKey: false }
);

sessionSchema.index({ athleteId: 1, sessionDate: -1 });
sessionSchema.index({ riskLevel: 1 });
sessionSchema.index({ weatherAlertLevel: 1 });
sessionSchema.index({ sessionDate: -1 });

module.exports = mongoose.model('TrainingSession', sessionSchema);
