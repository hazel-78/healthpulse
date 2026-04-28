const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age:          { type: Number },
  gender:       { type: String },
  surgeryType:  { type: String },
  surgeryDate:  { type: Date },
  doctor:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  familyMembers:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  recoveryDays: { type: Number, default: 30 },
  patientCode:  { type: String, unique: true } // code to link family/doctor
});

module.exports = mongoose.model('Patient', patientSchema);