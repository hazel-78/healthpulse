const express   = require('express');
const router    = express.Router();
const { protect } = require('../middleware/auth');
const Symptom   = require('../models/Symptom');
const User      = require('../models/User');

// ─────────────────────────────────────────────
// POST /api/symptoms/analyze
// Sends symptoms to Groq and returns severity + analysis
// ─────────────────────────────────────────────
router.post('/analyze', protect, async (req, res) => {
  try {
    const { painLevel, symptoms, location, duration, description } = req.body;

    const user        = await User.findById(req.user._id).select('-password');
    const surgeryType = user.surgeryType || 'general surgery';
    const surgery     = user.surgeryDate ? new Date(user.surgeryDate) : null;
    const daysSince   = surgery ? Math.floor((Date.now() - surgery) / 86400000) : 0;
    const symptomList = (symptoms || []).join(', ') || 'not specified';

    const prompt = `You are a medical AI assistant for a post-surgery recovery app. A patient recovering from ${surgeryType} (Day ${daysSince} of recovery) has reported:

Pain level: ${painLevel}/10
Symptoms: ${symptomList}
Location: ${location || 'not specified'}
Duration: ${duration || 'not specified'}
Description: ${description || 'none provided'}

Respond in exactly this format (no extra text):
SEVERITY: [Low, Medium, or High]
ASSESSMENT: [2-3 sentences about what these symptoms may indicate for ${surgeryType} recovery]
ACTION: [2-3 specific steps the patient should take right now]`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 350,
        temperature: 0.4,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      console.error('Groq error:', err);
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    const groqData = await groqRes.json();
    const raw      = groqData?.choices?.[0]?.message?.content?.trim() || '';

    // Parse response
    const severityMatch  = raw.match(/SEVERITY:\s*(Low|Medium|High)/i);
    const assessmentMatch = raw.match(/ASSESSMENT:\s*([\s\S]*?)(?=ACTION:|$)/i);
    const actionMatch    = raw.match(/ACTION:\s*([\s\S]*?)$/i);

    const severity   = severityMatch?.[1]  || 'Medium';
    const assessment = assessmentMatch?.[1]?.trim() || '';
    const action     = actionMatch?.[1]?.trim() || '';
    const analysis   = `${assessment}\n\nRecommended Action:\n${action}`;

    res.json({ severity, analysis });
  } catch (err) {
    console.error('Symptom analyze error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/symptoms/save
// Save symptom report to DB
// ─────────────────────────────────────────────
router.post('/save', protect, async (req, res) => {
  try {
    const { painLevel, symptoms, location, duration, description, severity, analysis } = req.body;
    const symptom = await Symptom.create({
      patient:     req.user._id,
      painLevel:   painLevel || 0,
      symptoms:    symptoms  || [],
      location:    location  || '',
      duration:    duration  || '',
      description: description || '',
      severity:    severity  || 'Medium',
      analysis:    analysis  || '',
    });
    res.status(201).json(symptom);
  } catch (err) {
    console.error('Symptom save error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/symptoms/history
// Get symptom history for logged-in patient
// ─────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const limit    = parseInt(req.query.limit) || 20;
    const symptoms = await Symptom.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(symptoms);
  } catch (err) {
    console.error('Symptom history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;