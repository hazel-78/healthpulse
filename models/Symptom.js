const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  patient:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symptomName:  { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  severity:     { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
  aiSuggestion: { type: String, default: '' }, // AI-generated advice
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // doctor
  reviewedAt:   { type: Date },
  status:       { type: String, enum: ['pending', 'reviewed', 'flagged'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Symptom', symptomSchema);