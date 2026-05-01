const express   = require('express');
const router    = express.Router();
const { protect } = require('../middleware/auth');
const HealthLog = require('../models/HealthLog');
const User      = require('../models/User');

router.get('/insight', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const log  = await HealthLog.findOne({ patient: req.user._id }).sort({ createdAt: -1 });

    if (!log) {
      return res.status(404).json({ message: 'No vitals available yet for insight.' });
    }

    const surgery     = user.surgeryDate ? new Date(user.surgeryDate) : null;
    const daysSince   = surgery ? Math.floor((Date.now() - surgery) / 86400000) : 0;
    const surgeryType = user.surgeryType || 'general surgery';

    const vitalsText = [
      log.heartRate     ? `Heart Rate: ${log.heartRate} bpm`          : null,
      log.bloodPressure ? `Blood Pressure: ${log.bloodPressure} mmHg` : null,
      log.oxygenLevel   ? `Oxygen Saturation: ${log.oxygenLevel}%`    : null,
      log.temperature   ? `Temperature: ${log.temperature}°C`          : null,
      log.haemoglobin   ? `Haemoglobin: ${log.haemoglobin} g/dL`      : null,
      log.bloodGlucose  ? `Blood Glucose: ${log.bloodGlucose} mg/dL`  : null,
    ].filter(Boolean).join('\n');

    const doctorNote = log.notes ? `Doctor's note: "${log.notes}"` : '';

    const prompt = `You are a medical AI assistant for a post-surgery recovery app. A patient is recovering from ${surgeryType} and is on Day ${daysSince} of recovery.

Their latest vitals are:
${vitalsText}
${doctorNote}

Based on these vitals and the type of surgery, provide a SHORT, friendly, and specific AI health insight (2-3 sentences max).
- Mention what looks good and what needs attention
- Give 1 practical tip specific to ${surgeryType} recovery
- Do NOT repeat the doctor's note
- Do NOT use medical jargon
- Write directly to the patient as "you"
- Do NOT start with "Based on" or "According to"`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      console.error('Gemini error:', err);
      return res.status(502).json({ message: 'AI service unavailable.' });
    }

    const geminiData = await geminiRes.json();
    const insight = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insight) {
      return res.status(502).json({ message: 'AI returned empty response.' });
    }

    res.json({ insight });

  } catch (err) {
    console.error('Insight error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

module.exports = router;