const express = require('express');
const User    = require('../models/User');
const { protect, authorise } = require('../middleware/auth');
const router  = express.Router();

// ── GET /api/patient/me  (patient only) ──
// Returns the logged-in patient's full profile
router.get('/me', protect, authorise('patient'), async (req, res) => {
  try {
    const patient = await User.findById(req.user._id)
      .select('-password')
      .populate('linkedDoctor', 'name email phone');
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/patient/list  (doctor only) ──
// Returns all patients linked to this doctor
router.get('/list', protect, authorise('doctor'), async (req, res) => {
  try {
    const doctor = await User.findById(req.user._id).populate({
      path: 'linkedPatients',
      select: '-password',
    });
    res.json(doctor.linkedPatients);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/patient/watching  (family only) ──
// Returns all patients this family member is watching
router.get('/watching', protect, authorise('family'), async (req, res) => {
  try {
    const family = await User.findById(req.user._id).populate({
      path: 'watchingPatients',
      select: '-password',
      populate: { path: 'linkedDoctor', select: 'name email phone' },
    });
    res.json(family.watchingPatients);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/patient/link  (doctor only) ──
// Link an additional patient to the doctor after registration
router.post('/link', protect, authorise('doctor'), async (req, res) => {
  try {
    const { patientCode } = req.body;
    if (!patientCode) return res.status(400).json({ message: 'patientCode is required.' });

    const code = patientCode.trim().toUpperCase();
    const patient = await User.findOne({ patientCode: code, role: 'patient' });

    if (!patient) {
      return res.status(404).json({ message: `No patient found with code "${code}".` });
    }
    if (patient.linkedDoctor) {
      return res.status(409).json({ message: `Patient "${patient.name}" is already linked to a doctor.` });
    }

    // Link
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { linkedPatients: patient._id },
    });
    await User.findByIdAndUpdate(patient._id, { linkedDoctor: req.user._id });

    res.json({ message: `${patient.name} has been linked to your account.`, patient });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/patient/watch  (family only) ──
// Link an additional patient to watch after registration
router.post('/watch', protect, authorise('family'), async (req, res) => {
  try {
    const { patientCode } = req.body;
    if (!patientCode) return res.status(400).json({ message: 'patientCode is required.' });

    const code = patientCode.trim().toUpperCase();
    const patient = await User.findOne({ patientCode: code, role: 'patient' });

    if (!patient) {
      return res.status(404).json({ message: `No patient found with code "${code}".` });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { watchingPatients: patient._id },
    });

    res.json({ message: `Now watching ${patient.name}.`, patient });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;