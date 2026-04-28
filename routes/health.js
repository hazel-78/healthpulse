const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const HealthLog = require('../models/HealthLog');
const Patient = require('../models/Patient');

// Log health vitals
router.post('/log', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const log = await HealthLog.create({ patient: patient._id, ...req.body });
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get health logs
router.get('/logs', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const logs = await HealthLog.find({ patient: patient._id }).sort({ loggedAt: -1 }).limit(30);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;