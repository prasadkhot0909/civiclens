const express = require('express');
const router = express.Router();
const { authManager, requireAuth } = require('../auth/auth');

// Send Email Verification Code to citizen
router.post('/send-code', (req, res) => {
  try {
    const { email } = req.body;
    const result = authManager.sendVerificationCode(email);
    res.json({
      success: true,
      message: `Verification code dispatched to ${result.email}`,
      email: result.email,
      verificationCode: result.code // Provided for simulated municipal dispatch / toast autofill
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Citizen Verification Code + Password Login/Registration
router.post('/citizen-verify-login', (req, res) => {
  try {
    const { email, verificationCode, password, name } = req.body;
    const session = authManager.verifyCitizenAndLogin(email, verificationCode, password, name);
    res.json({
      success: true,
      token: session.token,
      user: session.user,
      message: `Email verified successfully! Welcome, ${session.user.name}.`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Login endpoint (Citizen or Department Representative)
router.post('/login', (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const requiredRole = portal === 'department' ? 'DEPARTMENT' : (portal === 'citizen' ? 'CITIZEN' : null);
    const session = authManager.login(email, password, requiredRole);

    res.json({
      success: true,
      token: session.token,
      user: session.user,
      message: `Welcome back, ${session.user.name}!`
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

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

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

// List demo accounts for quick testing of both portals
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: authManager.getDemoAccounts()
  });
});

module.exports = router;
