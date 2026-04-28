const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  loggedAt:    { type: Date, default: Date.now },
  heartRate:   { type: Number },
  bloodPressureSystolic:  { type: Number },
  bloodPressureDiastolic: { type: Number },
  spo2:        { type: Number },
  temperature: { type: Number },
  painLevel:   { type: Number, min: 0, max: 10 },
  notes:       { type: String }
});

module.exports = mongoose.model('HealthLog', healthLogSchema);