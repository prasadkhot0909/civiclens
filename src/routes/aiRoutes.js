const express = require('express');
const router = express.Router();
const { analyzeGrievance } = require('../ai/aiEngine');
const { PRESETS } = require('../ai/presets');

// Return sample presets
router.get('/presets', (req, res) => {
  res.json({
    success: true,
    presets: PRESETS
  });
});

// Analyze grievance preview (before submission)
router.post('/analyze-preview', async (req, res) => {
  try {
    const { imageBase64, description, location } = req.body;

    if (!imageBase64 && !description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an image or description for AI analysis.'
      });
    }

    const triage = await analyzeGrievance({
      imageBase64,
      description,
      location
    });

    res.json({
      success: true,
      triage
    });
  } catch (err) {
    console.error('[Route] AI analyze error:', err);
    res.status(500).json({
      success: false,
      error: 'AI analysis failed: ' + err.message
    });
  }
});

// Get AI configuration status
router.get('/status', (req, res) => {
  const hasEnvKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  res.json({
    success: true,
    activeEngine: hasEnvKey ? 'Google Gemini 2.5 Flash Vision' : 'Built-in Neural Urban Defect Analyzer',
    hasKey: hasEnvKey
  });
});

module.exports = router;
