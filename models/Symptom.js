const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  reportedAt:  { type: Date, default: Date.now },
  symptoms:    [{ type: String }],
  description: { type: String },
  severity:    { type: String, enum: ['mild', 'moderate', 'severe', 'critical'] },
  aiAnalysis:  { type: String },
  action:      { type: String }
});

module.exports = mongoose.model('Symptom', symptomSchema);