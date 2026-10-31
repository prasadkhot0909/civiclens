const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_FILE = path.join(__dirname, '../../data/keys.json');

// Department Master RSA Key Pair (RSA-OAEP 2048-bit)
let keyPair = null;

function initKeys() {
  if (fs.existsSync(KEYS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      if (data.publicKeyPem && data.privateKeyPem) {
        keyPair = data;
        return;
      }
    } catch (e) {
      console.warn('Could not read existing keys, regenerating...', e.message);
    }
  }

  // Generate fresh RSA 2048-bit key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Also export as JWK for direct browser Web Crypto API import
  const pubKeyObj = crypto.createPublicKey(publicKey);
  const jwkPublicKey = pubKeyObj.export({ format: 'jwk' });

  const privKeyObj = crypto.createPrivateKey(privateKey);
  const jwkPrivateKey = privKeyObj.export({ format: 'jwk' });

  keyPair = {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    jwkPublicKey,
    jwkPrivateKey,
    fingerprint: crypto.createHash('sha256').update(publicKey).digest('hex').substring(0, 16),
    createdAt: new Date().toISOString()
  };

  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keyPair, null, 2), 'utf-8');
  console.log(`[E2EE] Department RSA Key Pair initialized. Fingerprint: ${keyPair.fingerprint}`);
}

function getPublicKey() {
  if (!keyPair) initKeys();
  return {
    publicKeyPem: keyPair.publicKeyPem,
    jwkPublicKey: keyPair.jwkPublicKey,
    fingerprint: keyPair.fingerprint
  };
}

function getPrivateKey() {
  if (!keyPair) initKeys();
  return {
    privateKeyPem: keyPair.privateKeyPem,
    jwkPrivateKey: keyPair.jwkPrivateKey,
    fingerprint: keyPair.fingerprint
  };
}

// Server-side decrypt function for test verification or official department token
function decryptWithDepartmentKey(encryptedKeyBase64) {
  if (!keyPair) initKeys();
  const buffer = Buffer.from(encryptedKeyBase64, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: keyPair.privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  );
  return decrypted.toString('utf-8');
}

module.exports = {
  initKeys,
  getPublicKey,
  getPrivateKey,
  decryptWithDepartmentKey
};
