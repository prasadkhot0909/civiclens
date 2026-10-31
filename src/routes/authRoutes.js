const express = require('express');
const router = express.Router();
const { authManager, requireAuth } = require('../auth/auth');

// Unified Secure Login endpoint (Citizens & Department Representatives)
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both your email address and password.'
      });
    }

    const session = authManager.login(email, password);

    res.json({
      success: true,
      token: session.token,
      user: session.user,
      message: `Welcome, ${session.user.name}!`
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message
    });
  }
});

// Citizen registration endpoint
router.post('/register', (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    const session = authManager.registerCitizen({ email, password, name, phone });

    res.json({
      success: true,
      token: session.token,
      user: session.user,
      message: `Registration successful! Welcome to CivicSense, ${session.user.name}.`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Get current logged-in user profile
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    authManager.destroySession(token);
  }
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

module.exports = router;
