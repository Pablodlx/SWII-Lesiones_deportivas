const { mongoose } = require('../db');

const athleteSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    sex: { type: String, enum: ['male', 'female', 'other'], required: true },
    heightCm: Number,
    weightKg: Number,
    primarySport: { type: String, required: true },
    team: String
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Athlete', athleteSchema);
