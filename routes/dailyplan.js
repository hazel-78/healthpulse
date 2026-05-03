const express  = require('express');
const router   = express.Router();
const { protect } = require('../middleware/auth');
const User     = require('../models/User');
const HealthLog = require('../models/HealthLog');

// ─────────────────────────────────────────────
// POST /api/dailyplan/generate
// Generates a personalised daily plan via Groq
// ─────────────────────────────────────────────
router.post('/generate', protect, async (req, res) => {
  try {
    const user        = await User.findById(req.user._id).select('-password');
    const surgeryType = user.surgeryType || 'general surgery';
    const surgery     = user.surgeryDate ? new Date(user.surgeryDate) : null;
    const daysSince   = surgery ? Math.floor((Date.now() - surgery) / 86400000) : 0;
    const gender      = user.gender || 'not specified';
    const age         = user.age || 'not specified';

    // Get latest vitals for context
    const latestLog = await HealthLog.findOne({ patient: req.user._id }).sort({ createdAt: -1 });
    const vitalsContext = latestLog
      ? `Latest vitals: HR ${latestLog.heartRate || '—'} bpm, BP ${latestLog.bloodPressure || '—'}, SpO2 ${latestLog.oxygenLevel || '—'}%, Temp ${latestLog.temperature || '—'}°C`
      : 'No recent vitals available';

    const prompt = `You are a medical recovery AI. Create a personalised daily recovery plan for a patient with these details:
- Surgery: ${surgeryType}
- Recovery Day: ${daysSince}
- Age: ${age}, Gender: ${gender}
- ${vitalsContext}

Return ONLY valid JSON in exactly this structure (no markdown, no extra text):
{
  "foods": ["item 1", "item 2", "item 3", "item 4", "item 5"],
  "activities": ["activity 1", "activity 2", "activity 3", "activity 4"],
  "dos": ["do 1", "do 2", "do 3", "do 4"],
  "donts": ["dont 1", "dont 2", "dont 3", "dont 4"],
  "schedule": [
    {"time": "7:00 AM", "activity": "description"},
    {"time": "9:00 AM", "activity": "description"},
    {"time": "12:00 PM", "activity": "description"},
    {"time": "3:00 PM", "activity": "description"},
    {"time": "6:00 PM", "activity": "description"},
    {"time": "9:00 PM", "activity": "description"}
  ]
}

Make everything specific to ${surgeryType} recovery on Day ${daysSince}. Be practical and friendly.`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.6,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      console.error('Groq dailyplan error:', err);
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    const groqData = await groqRes.json();
    const raw      = groqData?.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return res.status(502).json({ message: 'AI returned empty response.' });
    }

    // Parse JSON — strip any markdown fences if present
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let plan;
    try {
      plan = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', cleaned);
      return res.status(502).json({ message: 'AI returned invalid format. Please try again.' });
    }

    res.json(plan);

  } catch (err) {
    console.error('Daily plan error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

module.exports = router;