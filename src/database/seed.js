const crypto = require('crypto');
const db = require('./db');
const { getPublicKey } = require('../crypto/keyStore');
const { analyzeLocally } = require('../ai/aiEngine');
const { PRESETS } = require('../ai/presets');

function seedDemoGrievancesIfEmpty() {
  const existing = db.getAll();
  if (existing.length > 0) return;

  console.log('[Seed] Database empty. Pre-populating with initial sample civic grievances...');
  const keyInfo = getPublicKey();

  PRESETS.forEach((preset, index) => {
    // Generate AES 256-bit symmetric key for this grievance
    const symmetricKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const payload = {
      description: preset.description,
      location: preset.location,
      citizenName: index % 2 === 0 ? 'Aarav Mehta' : 'Anonymous Citizen',
      citizenPhone: index % 2 === 0 ? '+91 98200 45112' : '',
      imageDataUrl: preset.imageDataUrl,
      timestamp: new Date(Date.now() - (index * 6 * 3600 * 1000)).toISOString()
    };

    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, iv);
    let ciphertext = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    // Encrypt symmetric key with Department RSA Public Key
    const encryptedSymmetricKeyForDept = crypto.publicEncrypt(
      {
        key: keyInfo.publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(symmetricKey.toString('base64'), 'utf-8')
    ).toString('base64');

    // Generate Citizen Passkey
    const citizenPasskey = `PASS-${preset.id.toUpperCase()}-2026`;
    const citizenPasskeyHash = crypto.createHash('sha256').update(citizenPasskey).digest('hex');

    // Run AI Triage
    const aiTriage = analyzeLocally({
      imageBase64: preset.imageDataUrl,
      description: preset.description,
      location: preset.location
    });

    const grievanceId = `GRV-2026-${(1001 + index)}`;
    const createdAt = new Date(Date.now() - (index * 6 * 3600 * 1000)).toISOString();

    const statuses = ['ASSIGNED', 'IN_PROGRESS', 'ASSIGNED', 'RESOLVED'];
    const currentStatus = statuses[index % statuses.length];

    const grievance = {
      id: grievanceId,
      citizenEmail: 'citizen@civic.gov',
      createdAt,
      updatedAt: new Date().toISOString(),
      status: currentStatus,
      passkeyHint: `Sample passkey: ${citizenPasskey}`,
      encryptedData: {
        ciphertext,
        iv: iv.toString('base64'),
        authTag,
        encryptedSymmetricKeyForDept,
        encryptedSymmetricKeyForCitizen: symmetricKey.toString('base64'), // Demo convenient access
        citizenPasskeyHash
      },
      aiTriage,
      resolution: currentStatus === 'RESOLVED' ? {
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Rapid Response Team Unit 3',
        resolutionNotes: 'Snapped high-voltage line safely isolated, ground cleared, and replacement cable tensioned. Power restored safely.',
        proofImageUrl: null
      } : {
        resolvedAt: null,
        resolvedBy: null,
        resolutionNotes: null,
        proofImageUrl: null
      },
      auditLog: [
        {
          status: 'SUBMITTED',
          timestamp: createdAt,
          note: 'Citizen submitted grievance with client-side AES-256-GCM encryption.'
        },
        {
          status: 'AI_TRIAGED',
          timestamp: createdAt,
          note: `AI identified "${aiTriage.detectedIssue}". Criticality: ${aiTriage.criticality}.`
        },
        {
          status: 'ASSIGNED',
          timestamp: createdAt,
          note: `Routed to ${aiTriage.department.name}. Deadline: ${aiTriage.deadlineLabel}.`
        }
      ]
    };

    if (currentStatus === 'IN_PROGRESS') {
      grievance.auditLog.push({
        status: 'IN_PROGRESS',
        timestamp: new Date().toISOString(),
        note: 'Field crew dispatched with machinery to site.'
      });
    } else if (currentStatus === 'RESOLVED') {
      grievance.auditLog.push({
        status: 'RESOLVED',
        timestamp: new Date().toISOString(),
        note: 'Issue verified as resolved by Field Supervisor.'
      });
    }

    db.create(grievance);
  });

  console.log(`[Seed] Seeded ${PRESETS.length} sample grievances successfully.`);
}

module.exports = { seedDemoGrievancesIfEmpty };
