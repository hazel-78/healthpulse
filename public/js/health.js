const express   = require('express');
const HealthLog = require('../models/HealthLog');
const User      = require('../models/User');
const { protect, authorise } = require('../middleware/auth');
const router = express.Router();

// ── POST /api/health/log  (doctor only) ──
// Doctor logs vitals for a patient
router.post('/log', protect, authorise('doctor'), async (req, res) => {
  try {
    const { patientId, heartRate, bloodPressure, oxygenLevel,
            temperature, haemoglobin, bloodGlucose, notes } = req.body;

    if (!patientId) return res.status(400).json({ message: 'patientId is required.' });

    // Verify this doctor is linked to that patient
    const doctor = await User.findById(req.user._id);
    const isLinked = doctor.linkedPatients.some(id => id.toString() === patientId);
    if (!isLinked) {
      return res.status(403).json({ message: 'You are not linked to this patient.' });
    }

    const log = await HealthLog.create({
      patient: patientId,
      loggedBy: req.user._id,
      heartRate, bloodPressure, oxygenLevel,
      temperature, haemoglobin, bloodGlucose, notes,
    });

    res.status(201).json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/health/latest  (patient, doctor, family) ──
// Returns the most recent vitals entry for the calling patient,
// or for a patientId param (doctor/family use)
router.get('/latest', protect, async (req, res) => {
  try {
    let patientId;

    if (req.user.role === 'patient') {
      patientId = req.user._id;
    } else if (req.user.role === 'doctor' || req.user.role === 'family') {
      patientId = req.query.patientId;
      if (!patientId) return res.status(400).json({ message: 'patientId query param required.' });
    }

    const log = await HealthLog.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .populate('loggedBy', 'name');

    if (!log) return res.status(404).json({ message: 'No vitals logged yet.' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── GET /api/health/history  ──
// Returns last N vitals entries (default 10)
router.get('/history', protect, async (req, res) => {
  try {
    let patientId;
    if (req.user.role === 'patient') patientId = req.user._id;
    else patientId = req.query.patientId;
    if (!patientId) return res.status(400).json({ message: 'patientId required.' });

    const limit = parseInt(req.query.limit) || 10;
    const logs = await HealthLog.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('loggedBy', 'name');

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;