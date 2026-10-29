const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { decryptWithDepartmentKey } = require('../crypto/keyStore');
const { verifyResolutionProof } = require('../ai/aiEngine');
const { requireDepartment } = require('../auth/auth');

// All department endpoints are protected and restricted exclusively to Department Representatives
router.use(requireDepartment);

// List department tickets
router.get('/tickets', (req, res) => {
  const userDept = req.user.departmentId;
  const requestedDept = req.query.dept;
  
  // If user is assigned to a specific department and requested 'all', let them or default to their department
  let deptToQuery = requestedDept || (userDept && userDept !== 'all' ? userDept : 'all');
  const grievances = db.getByDepartment(deptToQuery);

  // Format tickets with deadline countdown indicators
  const now = Date.now();
  const formatted = grievances.map(g => {
    let slaStatus = 'ON_TRACK';
    let remainingMs = 0;

    if (g.aiTriage && g.aiTriage.deadlineAt) {
      remainingMs = new Date(g.aiTriage.deadlineAt).getTime() - now;
      if (g.status === 'RESOLVED') {
        slaStatus = 'RESOLVED';
      } else if (remainingMs <= 0) {
        slaStatus = 'BREACHED';
      } else if (remainingMs < 12 * 3600 * 1000) {
        slaStatus = 'URGENT';
      }
    }

    return {
      id: g.id,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      status: g.status,
      slaStatus,
      remainingMs,
      encryptedData: g.encryptedData,
      aiTriage: g.aiTriage,
      resolution: g.resolution,
      auditLog: g.auditLog
    };
  });

  res.json({
    success: true,
    count: formatted.length,
    tickets: formatted
  });
});

// Authorised Department Officer decryption helper
// Decrypts the symmetric key using the Department RSA Private Key
router.post('/decrypt-key', (req, res) => {
  try {
    const { encryptedKeyForDept } = req.body;

    if (!encryptedKeyForDept) {
      return res.status(400).json({
        success: false,
        error: 'Missing encrypted key parameter.'
      });
    }

    const decryptedKeyJson = decryptWithDepartmentKey(encryptedKeyForDept);

    res.json({
      success: true,
      symmetricKey: decryptedKeyJson
    });
  } catch (err) {
    console.error('[Dept] Decryption key unwrapping failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Department Key Decryption Failed: ' + err.message
    });
  }
});

// AI Resolution Verification & Proof Validation
// Validates photo of resolved area against original defect photo and location
router.post('/verify-resolution', async (req, res) => {
  try {
    const { grievanceId, proofImageBase64, resolutionNotes, resolvedBy, beforeImageBase64: clientBeforeImage } = req.body;

    const grievance = db.getById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ success: false, error: 'Grievance not found.' });
    }

    if (!proofImageBase64 || proofImageBase64.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory resolution photo missing. You must upload a photograph of the resolved area.'
      });
    }

    // Determine Before Image
    let beforeImage = clientBeforeImage || '';

    // If before image wasn't sent directly by client, decrypt it using Department RSA key
    if (!beforeImage && grievance.encryptedData && grievance.encryptedData.encryptedSymmetricKeyForDept) {
      try {
        const unwrappedKeyBase64 = decryptWithDepartmentKey(grievance.encryptedData.encryptedSymmetricKeyForDept);
        const iv = Buffer.from(grievance.encryptedData.iv, 'base64');
        const ciphertext = grievance.encryptedData.ciphertext;
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(unwrappedKeyBase64, 'base64'), iv);
        if (grievance.encryptedData.authTag) {
          decipher.setAuthTag(Buffer.from(grievance.encryptedData.authTag, 'base64'));
        }
        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        const parsed = JSON.parse(decrypted);
        beforeImage = parsed.imageDataUrl || '';
      } catch (err) {
        console.warn('[Dept] Could not auto-decrypt before image from ciphertext:', err.message);
      }
    }

    const defectType = grievance.aiTriage?.detectedIssue || 'Civic Infrastructure Defect';
    const location = grievance.aiTriage?.department?.jurisdiction || '';

    // Run AI Resolution Verification Agent
    const verificationReport = await verifyResolutionProof({
      beforeImageBase64: beforeImage,
      proofImageBase64,
      defectType,
      location,
      notes: resolutionNotes || ''
    });

    // Check verification outcome
    if (!verificationReport.isResolved || verificationReport.verificationStatus !== 'VERIFIED') {
      return res.status(422).json({
        success: false,
        verified: false,
        error: verificationReport.rejectionReason || 'AI Image Verification Failed: Problem not confirmed as resolved.',
        report: verificationReport
      });
    }

    // Verification PASSED! Mark grievance as RESOLVED
    const resolution = {
      resolvedAt: new Date().toISOString(),
      resolvedBy: resolvedBy || 'Field Response Squad',
      resolutionNotes: resolutionNotes || 'Defect verified as rectified.',
      proofImageUrl: proofImageBase64,
      verificationReport: {
        engine: verificationReport.engine,
        verificationStatus: 'VERIFIED',
        verificationScore: verificationReport.verificationScore,
        locationMatchScore: verificationReport.locationMatchScore,
        locationConsistencyNotes: verificationReport.locationConsistencyNotes,
        remediationEvidence: verificationReport.remediationEvidence,
        inspectorSummary: verificationReport.inspectorSummary,
        verifiedAt: verificationReport.verifiedAt
      }
    };

    const updated = db.update(grievanceId, {
      status: 'RESOLVED',
      resolution,
      statusNote: `Officially RESOLVED & VERIFIED by AI Vision Inspector (Score: ${Math.round(verificationReport.verificationScore * 100)}%, Location Match: ${Math.round(verificationReport.locationMatchScore * 100)}%). Squad: "${resolution.resolvedBy}". Notes: "${resolution.resolutionNotes}"`
    });

    res.json({
      success: true,
      verified: true,
      ticket: updated,
      report: verificationReport,
      message: 'Resolution confirmed by AI visual inspection. Ticket successfully closed!'
    });

  } catch (err) {
    console.error('[Dept] Resolution verification error:', err);
    res.status(500).json({
      success: false,
      error: 'Resolution verification failed: ' + err.message
    });
  }
});

// Update ticket status (e.g. In Progress)
router.post('/update-status', (req, res) => {
  try {
    const { grievanceId, status } = req.body;

    const grievance = db.getById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ success: false, error: 'Grievance not found.' });
    }

    if (status === 'RESOLVED') {
      return res.status(400).json({
        success: false,
        error: 'To mark a grievance as RESOLVED, photographic proof of the resolved area must be submitted to /api/department/verify-resolution for AI image verification.'
      });
    }

    const updates = { status };
    if (status === 'IN_PROGRESS') {
      updates.statusNote = `Status changed to IN_PROGRESS. Response team dispatched to location.`;
    }

    const updated = db.update(grievanceId, updates);

    res.json({
      success: true,
      ticket: updated
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to update ticket: ' + err.message
    });
  }
});

// Get department analytics
router.get('/stats', (req, res) => {
  const stats = db.getStats();
  res.json({
    success: true,
    stats
  });
});

module.exports = router;
