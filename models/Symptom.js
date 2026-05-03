const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  painLevel:   { type: Number, default: 0 },
  symptoms:    [{ type: String }],
  location:    { type: String, default: '' },
  duration:    { type: String, default: '' },
  description: { type: String, default: '' },
  severity:    { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  analysis:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Symptom', symptomSchema);