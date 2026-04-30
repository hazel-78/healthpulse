const express    = require('express');
const router     = express.Router();
const { protect, authorise } = require('../middleware/auth');
const HealthLog  = require('../models/HealthLog');
const User       = require('../models/User');

// ─────────────────────────────────────────────
// POST /api/health/log  (doctor only)
// Body: { patientId, heartRate, bloodPressure,
//         oxygenLevel, temperature, haemoglobin,
//         bloodGlucose, notes }
// ─────────────────────────────────────────────
router.post('/log', protect, authorise('doctor'), async (req, res) => {
  try {
    const {
      patientId, heartRate, bloodPressure,
      oxygenLevel, temperature, haemoglobin,
      bloodGlucose, notes,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required.' });
    }

    // Verify patient exists and belongs to this doctor
    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    const log = await HealthLog.create({
      patient:       patientId,
      loggedBy:      req.user._id,
      heartRate:     heartRate     || null,
      bloodPressure: bloodPressure || null,
      oxygenLevel:   oxygenLevel   || null,
      temperature:   temperature   || null,
      haemoglobin:   haemoglobin   || null,
      bloodGlucose:  bloodGlucose  || null,
      notes:         notes         || '',
    });

    const populated = await log.populate('loggedBy', 'name');
    res.status(201).json({ success: true, log: populated });

  } catch (err) {
    console.error('Health log error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/health/latest  (patient only)
// Returns the most recent log for the logged-in patient
// ─────────────────────────────────────────────
router.get('/latest', protect, authorise('patient'), async (req, res) => {
  try {
    const log = await HealthLog.findOne({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('loggedBy', 'name');

    if (!log) return res.status(404).json({ message: 'No vitals logged yet.' });
    res.json(log);
  } catch (err) {
    console.error('Latest vitals error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/health/history  (patient or doctor)
// Patient: returns their own logs
// Doctor:  pass ?patientId=xxx to get a patient's logs
// ─────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    let patientId;

    if (req.user.role === 'patient') {
      patientId = req.user._id;
    } else if (req.user.role === 'doctor' || req.user.role === 'family') {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ message: 'patientId query param required.' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const logs = await HealthLog.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('loggedBy', 'name');

    res.json(logs);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/health/logs  (legacy alias — patient only)
// ─────────────────────────────────────────────
router.get('/logs', protect, authorise('patient'), async (req, res) => {
  try {
    const logs = await HealthLog.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('loggedBy', 'name');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;