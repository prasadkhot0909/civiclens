const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database/db');
const { analyzeGrievance } = require('../ai/aiEngine');
const { optionalAuth, requireAuth } = require('../auth/auth');

function generateGrievanceId() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `GRV-${year}-${rand}`;
}

// Get grievances submitted by the logged-in citizen
router.get('/my-grievances', requireAuth, (req, res) => {
  const userEmail = req.user.email.toLowerCase();
  const all = db.getAll();
  // Match by citizenEmail or return user's tickets (or all sample tickets for the demo citizen account)
  const myTickets = all.filter(g => {
    if (g.citizenEmail && g.citizenEmail.toLowerCase() === userEmail) return true;
    if (userEmail === 'citizen@civic.gov') return true; // Show demo tickets for convenience
    return false;
  });

  res.json({
    success: true,
    count: myTickets.length,
    grievances: myTickets
  });
});

// Submit a new encrypted grievance
router.post('/submit', optionalAuth, async (req, res) => {
  try {
    const {
      encryptedData,
      aiTriage: clientAiTriage,
      rawPreview, // Optional preview for server AI if not pre-computed
      passkeyHint,
      citizenEmail: clientCitizenEmail
    } = req.body;

    const citizenEmail = req.user ? req.user.email : (clientCitizenEmail || null);

    if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv) {
      return res.status(400).json({
        success: false,
        error: 'Missing encrypted grievance payload. End-to-end encryption is mandatory.'
      });
    }

    let finalTriage = clientAiTriage;

    // If client hasn't pre-triaged and provided temporary preview text/image for AI
    if (!finalTriage && rawPreview) {
      finalTriage = await analyzeGrievance({
        imageBase64: rawPreview.imageBase64,
        description: rawPreview.description,
        location: rawPreview.location
      });
    }

    if (!finalTriage) {
      return res.status(400).json({
        success: false,
        error: 'AI Triage analysis could not be determined. Please retry.'
      });
    }

    const grievanceId = generateGrievanceId();
    const now = new Date().toISOString();

    const newGrievance = {
      id: grievanceId,
      citizenEmail: citizenEmail || null,
      createdAt: now,
      updatedAt: now,
      status: 'ASSIGNED', // Automatically assigned to department by AI agent
      passkeyHint: passkeyHint || 'Generated Citizen Passkey',
      encryptedData: {
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag || '',
        encryptedSymmetricKeyForDept: encryptedData.encryptedSymmetricKeyForDept || '',
        encryptedSymmetricKeyForCitizen: encryptedData.encryptedSymmetricKeyForCitizen || '',
        citizenPasskeyHash: encryptedData.citizenPasskeyHash || ''
      },
      aiTriage: finalTriage,
      resolution: {
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        proofImageUrl: null
      },
      auditLog: [
        {
          status: 'SUBMITTED',
          timestamp: now,
          note: 'Citizen submitted grievance with client-side AES-256-GCM encryption.'
        },
        {
          status: 'AI_TRIAGED',
          timestamp: now,
          note: `AI identified "${finalTriage.detectedIssue}" with ${Math.round(finalTriage.confidence * 100)}% confidence. Criticality: ${finalTriage.criticality}.`
        },
        {
          status: 'ASSIGNED',
          timestamp: now,
          note: `Auto-routed to ${finalTriage.department.name}. Strict SLA deadline set: ${finalTriage.deadlineLabel} (by ${new Date(finalTriage.deadlineAt).toLocaleString()}).`
        }
      ]
    };

    db.create(newGrievance);

    res.json({
      success: true,
      grievanceId,
      status: newGrievance.status,
      aiTriage: finalTriage,
      deadlineAt: finalTriage.deadlineAt,
      departmentAssigned: finalTriage.department.name
    });
  } catch (err) {
    console.error('[Route] Grievance submission error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit grievance: ' + err.message
    });
  }
});

// Get grievance by ID (for citizen tracking and status verification)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const grievance = db.getById(id);

  if (!grievance) {
    return res.status(404).json({
      success: false,
      error: `Grievance with ID "${id}" was not found.`
    });
  }

  res.json({
    success: true,
    grievance: {
      id: grievance.id,
      createdAt: grievance.createdAt,
      updatedAt: grievance.updatedAt,
      status: grievance.status,
      encryptedData: grievance.encryptedData,
      aiTriage: grievance.aiTriage,
      resolution: grievance.resolution,
      auditLog: grievance.auditLog
    }
  });
});

// Verify citizen passkey
router.post('/verify-passkey', (req, res) => {
  const { grievanceId, passkey } = req.body;
  const grievance = db.getById(grievanceId);

  if (!grievance) {
    return res.status(404).json({ success: false, error: 'Grievance not found' });
  }

  const computedHash = crypto.createHash('sha256').update(passkey).digest('hex');
  const storedHash = grievance.encryptedData.citizenPasskeyHash;

  if (storedHash && computedHash !== storedHash) {
    return res.status(403).json({ success: false, error: 'Invalid citizen passkey.' });
  }

  res.json({
    success: true,
    message: 'Passkey verified successfully.'
  });
});

module.exports = router;
