const express = require('express');
const router = express.Router();
const { getPublicKey } = require('../crypto/keyStore');

// Expose the department public key for client-side RSA-OAEP encryption
router.get('/public-key', (req, res) => {
  try {
    const keyInfo = getPublicKey();
    res.json({
      success: true,
      algorithm: 'RSA-OAEP-256',
      fingerprint: keyInfo.fingerprint,
      jwk: keyInfo.jwkPublicKey,
      pem: keyInfo.publicKeyPem
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve department public key: ' + err.message
    });
  }
});

module.exports = router;
