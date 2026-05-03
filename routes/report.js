const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { protect } = require('../middleware/auth');
const HealthReport = require('../models/HealthReport');
const User     = require('../models/User');

// Multer storage — save to /uploads temporarily
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF and images allowed'));
  },
});

// ─────────────────────────────────────────────
// POST /api/report/analyze
// Upload file + AI explanation via Groq
// ─────────────────────────────────────────────
router.post('/analyze', protect, upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const user        = await User.findById(req.user._id).select('-password');
    const surgeryType = user.surgeryType || 'general surgery';
    const surgery     = user.surgeryDate ? new Date(user.surgeryDate) : null;
    const daysSince   = surgery ? Math.floor((Date.now() - surgery) / 86400000) : 0;
    const fileName    = req.file.originalname;
    const fileType    = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';

    // Read file as base64 for Groq vision (images) or text prompt (PDFs)
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64     = fileBuffer.toString('base64');

    let messages;

    if (fileType === 'image') {
      // Use vision model for images
      messages = [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${req.file.mimetype};base64,${base64}` },
          },
          {
            type: 'text',
            text: `This patient is recovering from ${surgeryType} (Day ${daysSince}). This is their medical lab report image. Please:
1. Extract all key values (test names, results, normal ranges)
2. Highlight any abnormal values
3. Explain what each result means in simple language
4. Comment on how these results relate to their ${surgeryType} recovery
Keep explanations friendly and jargon-free.`,
          },
        ],
      }];
    } else {
      // For PDF: ask Groq to analyze based on filename + context
      messages = [{
        role: 'user',
        content: `A patient recovering from ${surgeryType} (Day ${daysSince}) has uploaded a lab report PDF named "${fileName}". 

Based on common post-${surgeryType} lab reports, provide a helpful template analysis that:
1. Lists the typical tests found in such reports (CBC, metabolic panel, etc.)
2. Explains what each test checks for
3. Describes what normal vs abnormal results would mean
4. Gives recovery-specific advice for ${surgeryType} patients

Note: Since this is a PDF, explain that for full AI extraction they should take a photo/screenshot of the report and upload as an image.

Keep it friendly, clear, and under 400 words.`,
      }];
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: fileType === 'image' ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json();
      console.error('Groq report error:', err);
      return res.status(502).json({ message: 'AI service unavailable. Please try again.' });
    }

    const groqData = await groqRes.json();
    const analysis = groqData?.choices?.[0]?.message?.content?.trim();

    if (!analysis) {
      return res.status(502).json({ message: 'AI returned empty response.' });
    }

    // Save to DB
    await HealthReport.create({
      patient:  req.user._id,
      fileName,
      fileType,
      analysis,
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ analysis, fileName });

  } catch (err) {
    // Clean up temp file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Report analyze error:', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/report/history
// ─────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const reports = await HealthReport.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('fileName fileType createdAt');
    res.json(reports);
  } catch (err) {
    console.error('Report history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;