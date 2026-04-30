const mongoose = require('mongoose');

// Each vitals entry is logged by a doctor for a specific patient
const healthLogSchema = new mongoose.Schema({
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loggedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // doctor

  heartRate:     { type: Number },          // bpm
  bloodPressure: { type: String },          // "120/80"
  oxygenLevel:   { type: Number },          // % SpO2
  temperature:   { type: Number },          // °C
  haemoglobin:   { type: Number },          // g/dL
  bloodGlucose:  { type: Number },          // mg/dL

  notes:         { type: String, default: '' }, // doctor's note — visible to patient & family

  // Computed severity flag (set by backend based on values)
  overallStatus: { type: String, enum: ['normal', 'warning', 'critical'], default: 'normal' },

}, { timestamps: true });

// Auto-compute overall status before save
healthLogSchema.pre('save', function (next) {
  const flags = [];

  if (this.heartRate) {
    if (this.heartRate < 50 || this.heartRate > 120) flags.push('critical');
    else if (this.heartRate < 60 || this.heartRate > 100) flags.push('warning');
  }
  if (this.oxygenLevel) {
    if (this.oxygenLevel < 90) flags.push('critical');
    else if (this.oxygenLevel < 95) flags.push('warning');
  }
  if (this.temperature) {
    if (this.temperature > 39 || this.temperature < 35) flags.push('critical');
    else if (this.temperature > 37.5 || this.temperature < 36) flags.push('warning');
  }
  if (this.bloodPressure) {
    const parts = this.bloodPressure.split('/');
    if (parts.length === 2) {
      const s = parseInt(parts[0]), d = parseInt(parts[1]);
      if (s >= 160 || d >= 100) flags.push('critical');
      else if (s >= 130 || d >= 85) flags.push('warning');
    }
  }

  if (flags.includes('critical')) this.overallStatus = 'critical';
  else if (flags.includes('warning')) this.overallStatus = 'warning';
  else this.overallStatus = 'normal';

  next();
});

module.exports = mongoose.model('HealthLog', healthLogSchema);