const { mongoose } = require('../db');

const weatherSnapshotSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    snapshotDate: { type: Date, required: true },
    location: {
      lat: Number,
      lon: Number,
      countryCode: String
    },
    temperatureC: Number,
    humidity: Number,
    windSpeedKmh: Number,
    precipitationMm: Number,
    alertLevel: { type: String, enum: ['none', 'low', 'moderate', 'high', 'extreme'], default: 'none' },
    rawPayload: mongoose.Schema.Types.Mixed
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

weatherSnapshotSchema.index({ source: 1, snapshotDate: -1 });
weatherSnapshotSchema.index({ 'location.countryCode': 1, snapshotDate: -1 });

module.exports = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
