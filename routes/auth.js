const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const Patient  = require('../models/Patient');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, role, phone,
      // patient fields
      surgeryType, surgeryDate, age, gender,
      // doctor / family field
      patientCode,
    } = req.body;

    // 1. Duplicate email check
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 2. Build the new user object
    //    NOTE: Do NOT hash here. User.js pre('save') hook handles hashing.
    const userData = { name, email, password, role, phone: phone || '' };

    if (role === 'patient') {
      // Generate unique code and attach everything to the User document
      userData.patientCode  = await User.generatePatientCode();
      userData.age          = age          || null;
      userData.gender       = gender       || '';
      userData.surgeryType  = surgeryType  || '';
      userData.surgeryDate  = surgeryDate  ? new Date(surgeryDate) : null;
      userData.recoveryDays = 14;
    }

    // 3. Create user — pre('save') will hash the password automatically
    const user = await User.create(userData);

    // 4. If doctor or family, link them to the patient via patientCode
    if ((role === 'doctor' || role === 'family') && patientCode) {
      const linkedPatient = await User.findOne({ patientCode: patientCode.toUpperCase() });

      if (!linkedPatient) {
        // Don't block registration, just warn
        console.warn(`Patient code ${patientCode} not found — account created without link`);
      } else {
        if (role === 'doctor') {
          // Link doctor → patient and patient → doctor
          linkedPatient.linkedDoctor = user._id;
          user.linkedPatients.push(linkedPatient._id);
          await linkedPatient.save();
        } else {
          // Family: add to patient's watchers
          linkedPatient.watchingPatients = linkedPatient.watchingPatients || [];
          user.watchingPatients.push(linkedPatient._id);
        }
        await user.save();
      }

      // Also try syncing with Patient collection if it exists (legacy support)
      try {
        const patientDoc = await Patient.findOne({ patientCode: patientCode.toUpperCase() });
        if (patientDoc) {
          if (role === 'family') patientDoc.familyMembers?.push(user._id);
          if (role === 'doctor') patientDoc.doctor = user._id;
          await patientDoc.save();
        }
      } catch (_) { /* Patient model might not have these fields */ }
    }

    // 5. Also create a Patient document for backward compat if role === patient
    if (role === 'patient') {
      try {
        await Patient.create({
          userId:      user._id,
          age:         user.age,
          gender:      user.gender,
          surgeryType: user.surgeryType,
          surgeryDate: user.surgeryDate,
          patientCode: user.patientCode,
        });
      } catch (e) {
        console.warn('Patient collection sync warning:', e.message);
      }
    }

    // 6. Issue JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, role: user.role, name: user.name });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Use matchPassword from the User model (uses bcrypt.compare internally)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role, name: user.name });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('linkedDoctor', 'name email')   // patient sees their doctor's name
      .populate('linkedPatients', 'name email'); // doctor sees their patients

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;