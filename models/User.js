const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone:    { type: String, default: '' },
  role:     { type: String, enum: ['patient', 'doctor', 'family'], required: true },

  // ── PATIENT-only fields ──
  patientCode:  { type: String, unique: true, sparse: true }, // e.g. "HP3X7K2M"
  age:          { type: Number },
  gender:       { type: String, enum: ['Male', 'Female', 'Other', ''] },
  surgeryType:  { type: String, default: '' },
  surgeryDate:  { type: Date },
  recoveryDays: { type: Number, default: 14 },

  // Who is the linked doctor for this patient (one doctor only)
  linkedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── DOCTOR-only fields ──
  // List of patient IDs this doctor manages
  linkedPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── FAMILY-only fields ──
  // List of patient IDs this family member watches (multiple patients allowed)
  watchingPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

// Generate unique 8-char patient code: HP + 6 alphanumeric
userSchema.statics.generatePatientCode = async function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  let code, exists;
  do {
    code = 'HP';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    exists = await this.findOne({ patientCode: code });
  } while (exists);
  return code;
};

module.exports = mongoose.model('User', userSchema);