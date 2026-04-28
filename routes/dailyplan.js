const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Patient = require('../models/Patient');

async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

router.get('/today', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const daysSinceSurgery = patient.surgeryDate
      ? Math.floor((Date.now() - new Date(patient.surgeryDate)) / (1000 * 60 * 60 * 24))
      : 1;

    const prompt = `
A patient had ${patient.surgeryType || 'general surgery'} ${daysSinceSurgery} days ago.
Age: ${patient.age || 'unknown'}, Gender: ${patient.gender || 'unknown'}.
Recovery target: ${patient.recoveryDays} days.

Create a detailed recovery plan for today (Day ${daysSinceSurgery}). Include:
MORNING_ROUTINE: [specific morning activities]
FOODS_TO_EAT: [5 specific foods that help recovery]
FOODS_TO_AVOID: [3 foods to avoid]
EXERCISES: [gentle exercises appropriate for this recovery stage]
DOS: [3 important things to do today]
DONTS: [3 things to avoid today]
TIPS: [2 recovery tips for this specific surgery and day]
`;
    const plan = await callGemini(prompt);
    res.json({ success: true, plan, daysSinceSurgery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const daysSinceSurgery = patient.surgeryDate
      ? Math.floor((Date.now() - new Date(patient.surgeryDate)) / (1000 * 60 * 60 * 24))
      : 1;

    const prompt = `Patient had ${patient.surgeryType} surgery ${daysSinceSurgery} days ago. Provide today's recovery plan with foods, activities, dos and don'ts.`;
    const plan = await callGemini(prompt);
    res.json({ success: true, plan, daysSinceSurgery });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;