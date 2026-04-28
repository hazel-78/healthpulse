const mongoose = require('mongoose');

const healthReportSchema = new mongoose.Schema({
  patient:       { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  uploadedAt:    { type: Date, default: Date.now },
  rawText:       { type: String },
  extractedData: {
    haemoglobin:    { value: String, unit: String, status: String },
    heartRate:      { value: String, unit: String, status: String },
    bloodPressure:  { value: String, unit: String, status: String },
    spo2:           { value: String, unit: String, status: String },
    bodyTemperature:{ value: String, unit: String, status: String },
    bloodSugar:     { value: String, unit: String, status: String },
    creatinine:     { value: String, unit: String, status: String },
    wbc:            { value: String, unit: String, status: String },
    platelets:      { value: String, unit: String, status: String },
  },
  aiSummary:     { type: String },
  recommendations:{ type: String }
});

module.exports = mongoose.model('HealthReport', healthReportSchema);