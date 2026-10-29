require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initKeys } = require('./src/crypto/keyStore');
const { seedDemoGrievancesIfEmpty } = require('./src/database/seed');

const authRoutes = require('./src/routes/authRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const cryptoRoutes = require('./src/routes/cryptoRoutes');
const grievanceRoutes = require('./src/routes/grievanceRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Cryptographic Keys & Seeding
initKeys();
seedDemoGrievancesIfEmpty();

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/grievance', grievanceRoutes);
app.use('/api/department', departmentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'CivicSense AI - E2EE Grievance Triage System',
    version: '1.0.0'
  });
});

// Fallback to SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CIVICSENSE AI - E2EE CITIZEN GRIEVANCE SYSTEM`);
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log(`  E2EE Encryption: AES-256-GCM + RSA-OAEP-2048`);
  console.log(`  AI Vision Engine: Gemini 2.5 Flash + Neural Triage`);
  console.log(`====================================================`);
});
