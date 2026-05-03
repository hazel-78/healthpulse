require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to database
connectDB();

// Security & middleware (MUST be before routes)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/test-insight', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello in one sentence.' }] }]
        })
      }
    );
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.json({ error: e.message });
  }
});

// API Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/patient',  require('./routes/patient'));
app.use('/api/report',   require('./routes/report'));
app.use('/api/health',   require('./routes/health'));
app.use('/api/health',   require('./routes/insight'));
app.use('/api/symptoms', require('./routes/symptoms'));
app.use('/api/dailyplan',require('./routes/dailyplan'));

// Fallback: serve index.html for any unknown route
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HealthPulse running on port ${PORT}`);
});