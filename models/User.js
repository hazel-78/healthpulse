const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['patient', 'doctor', 'family'], required: true },
  phone:    { type: String },
  linkedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' }, // for family/doctor
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);