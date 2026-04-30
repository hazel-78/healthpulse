const mongoose = require('mongoose');

// Family members can fire an emergency alert to the linked doctor
const alertSchema = new mongoose.Schema({
  patient:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // family member
  sentTo:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // doctor
  message:     { type: String, default: 'Emergency! Please check the patient immediately.' },
  status:      { type: String, enum: ['sent', 'seen', 'resolved'], default: 'sent' },
  seenAt:      { type: Date },
  resolvedAt:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);