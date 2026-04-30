const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// 1. THE FIX: Destructure 'protect' from the auth middleware
const { protect } = require('../middleware/auth'); 

const HealthReport = require('../models/HealthReport');
const Patient = require('../models/Patient');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Call Gemini API
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

// UPLOAD & ANALYZE REPORT
// 2. THE FIX: Use 'protect' instead of 'authMiddleware'
router.post('/upload', protect, upload.single('report'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ message: 'Patient profile not found' });

    // Extract text from PDF
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text;

    // Ask Gemini to extract health values
    const extractPrompt = `
You are a medical report analyzer. Extract health values from this report text and return ONLY valid JSON (no markdown, no explanation):
{
  "haemoglobin": {"value": "", "unit": "", "status": "normal/low/high"},
  "heartRate": {"value": "", "unit": "", "status": ""},
  "bloodPressure": {"value": "", "unit": "", "status": ""},
  "spo2": {"value": "", "unit": "", "status": ""},
  "bodyTemperature": {"value": "", "unit": "", "status": ""},
  "bloodSugar": {"value": "", "unit": "", "status": ""},
  "creatinine": {"value": "", "unit": "", "status": ""},
  "wbc": {"value": "", "unit": "", "status": ""},
  "platelets": {"value": "", "unit": "", "status": ""}
}
Report text:
${rawText.substring(0, 3000)}
`;

    const extractedRaw = await callGemini(extractPrompt);
    let extractedData = {};
    try {
      const cleaned = extractedRaw.replace(/```json|```/g, '').trim();
      extractedData = JSON.parse(cleaned);
    } catch (e) {
      extractedData = {};
    }

    // Ask Gemini for summary and recommendations
    const summaryPrompt = `
Patient had surgery: ${patient.surgeryType || 'unknown surgery'}.
Based on these health values: ${JSON.stringify(extractedData)}
Give a short 3-sentence health summary and 3 specific recovery recommendations for this post-surgery patient.
Format your response as:
SUMMARY: [your summary here]
RECOMMENDATIONS: [your recommendations here]
`;
    const aiSummary = await callGemini(summaryPrompt);

    // Save to DB
    const report = await HealthReport.create({
      patient: patient._id,
      rawText,
      extractedData,
      aiSummary
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Report analysis failed' });
  }
});

// GET all reports for a patient
// 2. THE FIX: Use 'protect' instead of 'authMiddleware'
router.get('/my-reports', protect, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const reports = await HealthReport.find({ patient: patient._id }).sort({ uploadedAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;