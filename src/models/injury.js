const { mongoose } = require('../db');

const injurySchema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingSession', default: null },
    injuryDate: { type: Date, required: true },
    injuryType: { type: String, required: true },
    bodyPart: { type: String, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    daysOut: Number,
    notes: String
  },
  { timestamps: true, versionKey: false }
);

injurySchema.index({ athleteId: 1, injuryDate: -1 });
injurySchema.index({ injuryType: 1 });
injurySchema.index({ severity: 1 });

module.exports = mongoose.model('Injury', injurySchema);
