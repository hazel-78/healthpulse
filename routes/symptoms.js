const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Symptom = require('../models/Symptom');
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

router.post('/report', authMiddleware, async (req, res) => {
  try {
    const { symptoms, description, surgeryType } = req.body;
    const patient = await Patient.findOne({ userId: req.user.id });

    const prompt = `
A post-surgery patient (surgery: ${surgeryType || 'general'}) is reporting these symptoms: ${symptoms.join(', ')}.
Additional details: ${description}

Analyze and respond in this exact format:
SEVERITY: [mild/moderate/severe/critical]
ANALYSIS: [2-3 sentence analysis]
ACTION: [what the patient should do right now]
`;
    const aiResponse = await callGemini(prompt);

    // Parse severity
    const severityMatch = aiResponse.match(/SEVERITY:\s*(mild|moderate|severe|critical)/i);
    const severity = severityMatch ? severityMatch[1].toLowerCase() : 'moderate';

    const symptomLog = await Symptom.create({
      patient: patient._id,
      symptoms, description, severity,
      aiAnalysis: aiResponse,
      action: aiResponse
    });

    res.json({ success: true, symptomLog, aiResponse, severity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    const symptoms = await Symptom.find({ patient: patient._id }).sort({ reportedAt: -1 });
    res.json(symptoms);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;