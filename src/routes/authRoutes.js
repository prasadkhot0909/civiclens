const express = require('express');
const router = express.Router();
const { authManager, requireAuth } = require('../auth/auth');

// Unified Secure Login endpoint (Citizens & Department Representatives)
router.post('/login', (req, res) => {
  try {
    const { email, password, portal, requiredRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both your email address and password.'
      });
    }

    const roleTarget = requiredRole || (portal === 'department' ? 'DEPARTMENT' : (portal === 'citizen' ? 'CITIZEN' : null));
    const session = authManager.login(email, password, roleTarget);

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

// Department Representative registration endpoint
router.post('/register-department', (req, res) => {
  try {
    const { email, password, name, departmentId, title } = req.body;

    const session = authManager.registerDepartment({ email, password, name, departmentId, title });

    res.json({
      success: true,
      token: session.token,
      user: session.user,
      message: `Official account registered! Welcome to the Department Console, ${session.user.name}.`
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
