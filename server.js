require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Connect to database
connectDB();

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/patient',  require('./routes/patient'));
app.use('/api/report',   require('./routes/report'));
app.use('/api/health',   require('./routes/health'));
app.use('/api/symptoms', require('./routes/symptoms'));
app.use('/api/dailyplan',require('./routes/dailyplan'));

// Fallback: serve index.html for any unknown route
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HealthPulse running on port ${PORT}`);
});