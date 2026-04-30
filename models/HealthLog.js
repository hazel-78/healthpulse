const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  heartRate:     { type: Number, default: null },
  bloodPressure: { type: String, default: null },  // e.g. "120/80"
  oxygenLevel:   { type: Number, default: null },  // SpO2 %
  temperature:   { type: Number, default: null },  // °C
  haemoglobin:   { type: Number, default: null },  // g/dL
  bloodGlucose:  { type: Number, default: null },  // mg/dL
  notes:         { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('HealthLog', healthLogSchema);