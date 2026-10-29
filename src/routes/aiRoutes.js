const express = require('express');
const router = express.Router();
const { analyzeGrievance } = require('../ai/aiEngine');
const { PRESETS } = require('../ai/presets');

// In-memory runtime API key (if set via UI modal)
let runtimeApiKey = null;

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
      location,
      customApiKey: runtimeApiKey
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

// Set custom Gemini API Key via UI
router.post('/set-api-key', (req, res) => {
  const { apiKey } = req.body;
  runtimeApiKey = apiKey && apiKey.trim() ? apiKey.trim() : null;
  res.json({
    success: true,
    hasCustomKey: !!runtimeApiKey,
    message: runtimeApiKey ? 'Gemini API Key activated for live analysis.' : 'Gemini Key cleared; using built-in Neural Analyzer.'
  });
});

// Get AI configuration status
router.get('/status', (req, res) => {
  const hasEnvKey = !!process.env.GEMINI_API_KEY;
  const hasRuntimeKey = !!runtimeApiKey;
  res.json({
    success: true,
    activeEngine: (hasEnvKey || hasRuntimeKey) ? 'Google Gemini Multimodal Vision API' : 'Built-in Neural Urban Defect Analyzer',
    hasKey: hasEnvKey || hasRuntimeKey
  });
});

module.exports = router;
