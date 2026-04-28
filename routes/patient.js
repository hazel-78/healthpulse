const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Get patient profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id })
      .populate('doctor', 'name email')
      .populate('familyMembers', 'name email');
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update patient profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Doctor: get all linked patients
router.get('/my-patients', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Not a doctor' });
    const patients = await Patient.find({ doctor: req.user.id }).populate('userId', 'name email');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;