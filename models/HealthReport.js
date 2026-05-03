const mongoose = require('mongoose');

const healthReportSchema = new mongoose.Schema({
  patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, default: '' },
  fileType: { type: String, enum: ['pdf', 'image'], default: 'pdf' },
  analysis: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('HealthReport', healthReportSchema);