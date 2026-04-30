const express = require('express');
const router = express.Router();

// 1. THE FIX: Destructure both protect and authorise from your middleware
const { protect, authorise } = require('../middleware/auth'); 

const Patient = require('../models/Patient');
const User = require('../models/User');

// Get patient profile
// 2. THE FIX: Use 'protect' instead of 'authMiddleware'
router.get('/profile', protect, async (req, res) => {
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
// 2. THE FIX: Use 'protect' instead of 'authMiddleware'
router.put('/profile', protect, async (req, res) => {
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
// 3. BONUS: We can now use your `authorise` middleware to guard this route cleanly!
router.get('/my-patients', protect, authorise('doctor'), async (req, res) => {
  try {
    // The manual if-statement is gone! The middleware handles it now.
    const patients = await Patient.find({ doctor: req.user.id }).populate('userId', 'name email');
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;