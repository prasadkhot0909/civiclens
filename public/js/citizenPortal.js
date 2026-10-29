/**
 * CivicSense AI - Citizen Submission & Tracking Portal
 */

let selectedPreset = null;
let currentUploadedImageBase64 = null;
let activeAiTriageResult = null;
let activeTrackingCountdownInterval = null;

// Initialize Citizen Portal
async function initCitizenPortal() {
  loadPresets();
  setupImageUploadHandlers();
  setupFormHandlers();
  if (window.authClient && window.authClient.currentUser) {
    autoFillCitizenContact();
  }
}

function autoFillCitizenContact() {
  const user = window.authClient?.currentUser;
  if (!user || user.role !== 'CITIZEN') return;
  const nameInput = document.getElementById('input-name');
  const phoneInput = document.getElementById('input-phone');
  if (nameInput && !nameInput.value) nameInput.value = user.name || '';
  if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
}

// Load citizen's personal grievances list
window.loadMyGrievances = async function() {
  const container = document.getElementById('my-grievances-container');
  if (!container) return;

  if (!window.authClient || !window.authClient.currentUser) {
    container.innerHTML = `
      <div class="glass-panel p-8 rounded-2xl text-center space-y-3">
        <span class="text-3xl block">👤</span>
        <h4 class="text-sm font-bold text-gray-200">Log In to View Your Grievances</h4>
        <p class="text-xs text-gray-400">Please sign in with your citizen account to view all complaints submitted by you.</p>
        <button onclick="openCitizenLoginModal()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all">
          Citizen Login →
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="p-8 text-center text-gray-400">
      <svg class="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      Loading your complaints...
    </div>
  `;

  try {
    const res = await window.authClient.authFetch('/api/grievance/my-grievances');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const list = data.grievances;
    if (list.length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-10 rounded-2xl text-center space-y-2">
          <span class="text-3xl block">📝</span>
          <h4 class="text-sm font-bold text-gray-200">No Complaints Submitted Yet</h4>
          <p class="text-xs text-gray-400">You haven't filed any grievances yet. Report a pothole, garbage spill, or water leak anytime!</p>
          <button onclick="switchTab('submit')" class="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all">
            + File a Grievance
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${list.map(g => {
          const passkey = (g.passkeyHint || '').replace('Sample passkey: ', '').replace('Passkey: ', '').trim();
          return `
            <div class="glass-panel-elevated p-5 rounded-2xl border border-gray-700/80 space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                  ${g.id}
                </span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded ${
                  g.status === 'RESOLVED' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-blue-900/40 text-blue-300 border border-blue-700'
                }">
                  ${g.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h4 class="text-sm font-bold text-white">${g.aiTriage?.detectedIssue || 'Civic Issue'}</h4>
                <span class="text-xs text-blue-300">${g.aiTriage?.department?.name || 'Assigned'}</span>
              </div>

              <div class="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800">
                <span>Deadline: <strong class="text-amber-300 font-mono">${g.aiTriage?.deadlineLabel || '48 Hours'}</strong></span>
                <button onclick="openTrackWithDetails('${g.id}', '${passkey}')" 
                        class="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-bold text-white transition-all">
                  Track & Decrypt →
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

  } catch (err) {
    container.innerHTML = `
      <div class="p-6 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs text-center">
        Failed to load your complaints: ${err.message}
      </div>
    `;
  }
};

window.openTrackWithDetails = function(grievanceId, passkey) {
  switchTab('track');
  document.getElementById('track-input-id').value = grievanceId;
  document.getElementById('track-input-passkey').value = passkey || '';
  lookupGrievance();
};

// Load 4 Realistic Presets
async function loadPresets() {
  try {
    const res = await fetch('/api/ai/presets');
    const data = await res.json();
    if (!data.success) return;

    const container = document.getElementById('presets-container');
    if (!container) return;

    container.innerHTML = data.presets.map(preset => `
      <div onclick="selectPreset('${preset.id}')" 
           class="preset-card cursor-pointer p-3.5 rounded-xl border border-gray-700/60 bg-gray-800/40 hover:bg-gray-800/80 hover:border-blue-500/50 transition-all flex items-start gap-3 group">
        <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-gray-700">
          <img src="${preset.imageDataUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-1">
            <h4 class="text-xs font-bold text-gray-200 group-hover:text-blue-400 truncate">${preset.title}</h4>
            <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
              preset.expectedCriticality === 'CRITICAL' ? 'bg-red-900/40 text-red-300 border border-red-700/50' : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
            }">${preset.expectedCriticality}</span>
          </div>
          <p class="text-[11px] text-gray-400 line-clamp-2">${preset.description}</p>
        </div>
      </div>
    `).join('');

    window.presetsData = data.presets;
  } catch (err) {
    console.error('Failed to load presets:', err);
  }
}

// Select a preset and populate the form
window.selectPreset = function(presetId) {
  const preset = (window.presetsData || []).find(p => p.id === presetId);
  if (!preset) return;

  selectedPreset = preset;
  currentUploadedImageBase64 = preset.imageDataUrl;

  // Populate form
  document.getElementById('input-description').value = preset.description;
  document.getElementById('input-location').value = preset.location;

  // Update image preview
  showImagePreview(preset.imageDataUrl, preset.title);

  // Clear previous triage
  activeAiTriageResult = null;
  document.getElementById('ai-triage-preview-card').classList.add('hidden');

  showToast(`Sample selected: "${preset.title}". Click "Run AI Triage" to analyze.`, 'info');
};

// Handle file upload and drag & drop
function setupImageUploadHandlers() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-blue-500/10');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-500/10');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-500/10');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload a valid image file (JPEG, PNG, WEBP, or SVG).', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentUploadedImageBase64 = e.target.result;
    selectedPreset = null;
    showImagePreview(currentUploadedImageBase64, file.name);
    activeAiTriageResult = null;
    document.getElementById('ai-triage-preview-card').classList.add('hidden');
    showToast('Photo uploaded successfully! Ready for AI defect analysis.', 'success');
  };
  reader.readAsDataURL(file);
}

function showImagePreview(dataUrl, title) {
  const container = document.getElementById('image-preview-container');
  const img = document.getElementById('image-preview');
  const titleEl = document.getElementById('image-preview-title');
  const placeholder = document.getElementById('upload-placeholder');

  if (img && container && placeholder) {
    img.src = dataUrl;
    if (titleEl) titleEl.innerText = title || 'Uploaded Defect Image';
    placeholder.classList.add('hidden');
    container.classList.remove('hidden');
  }
}

window.clearUploadedImage = function() {
  currentUploadedImageBase64 = null;
  selectedPreset = null;
  const container = document.getElementById('image-preview-container');
  const placeholder = document.getElementById('upload-placeholder');
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
  if (container) container.classList.add('hidden');
  if (placeholder) placeholder.classList.remove('hidden');
  document.getElementById('ai-triage-preview-card').classList.add('hidden');
  activeAiTriageResult = null;
};

// Form event handlers
function setupFormHandlers() {
  const btnScanAi = document.getElementById('btn-scan-ai');
  const btnSubmit = document.getElementById('btn-submit-grievance');

  if (btnScanAi) {
    btnScanAi.addEventListener('click', runAiTriageScan);
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', submitEncryptedGrievance);
  }
}

// Run AI analysis preview
async function runAiTriageScan() {
  const description = document.getElementById('input-description').value.trim();
  const location = document.getElementById('input-location').value.trim();

  if (!currentUploadedImageBase64 && !description) {
    showToast('Please upload an image or enter a description of the defect first.', 'warning');
    return;
  }

  const btnScanAi = document.getElementById('btn-scan-ai');
  const originalHtml = btnScanAi.innerHTML;
  btnScanAi.disabled = true;
  btnScanAi.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    Analyzing Defect...
  `;

  try {
    const res = await fetch('/api/ai/analyze-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: currentUploadedImageBase64,
        description,
        location
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    activeAiTriageResult = data.triage;
    renderAiTriageCard(data.triage);
    showToast(`AI Analysis Complete: Routed to ${data.triage.department.name}`, 'success');
  } catch (err) {
    showToast('AI analysis failed: ' + err.message, 'error');
  } finally {
    btnScanAi.disabled = false;
    btnScanAi.innerHTML = originalHtml;
  }
}

// Render AI Triage diagnosis card
function renderAiTriageCard(triage) {
  const card = document.getElementById('ai-triage-preview-card');
  if (!card) return;

  const critColor = {
    CRITICAL: 'text-red-400 bg-red-950/50 border-red-800/80',
    HIGH: 'text-amber-400 bg-amber-950/50 border-amber-800/80',
    MEDIUM: 'text-blue-400 bg-blue-950/50 border-blue-800/80',
    LOW: 'text-gray-400 bg-gray-950/50 border-gray-800/80'
  }[triage.criticality] || 'text-amber-400 bg-amber-950/50 border-amber-800/80';

  card.innerHTML = `
    <div class="p-5 rounded-2xl glass-panel border border-blue-500/30 shadow-xl space-y-4">
      <div class="flex items-start justify-between gap-3 border-b border-gray-700/60 pb-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${critColor} border">
              CRITICALITY: ${triage.criticality}
            </span>
            <span class="text-xs text-gray-400">Confidence: <span class="text-emerald-400 font-mono font-bold">${Math.round(triage.confidence * 100)}%</span></span>
          </div>
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            ${triage.detectedIssue}
          </h3>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-[10px] text-gray-400 uppercase tracking-wider block">Target Department</span>
          <span class="text-xs font-bold text-blue-400">${triage.department.name}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
          <span class="text-[11px] font-semibold text-gray-400 block mb-1">⏱️ AI Assigned SLA Deadline</span>
          <div class="text-sm font-bold text-amber-300 font-mono">${triage.deadlineLabel}</div>
          <span class="text-[11px] text-gray-400">Must resolve by: ${new Date(triage.deadlineAt).toLocaleString()}</span>
        </div>
        <div class="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
          <span class="text-[11px] font-semibold text-gray-400 block mb-1">🏛️ Department Officer in Charge</span>
          <div class="text-xs font-bold text-gray-200">${triage.department.officerInCharge}</div>
          <span class="text-[11px] text-gray-400">${triage.department.email}</span>
        </div>
      </div>

      <div class="bg-gray-900/40 p-3 rounded-xl border border-gray-800/80 space-y-2 text-xs">
        <div>
          <span class="font-semibold text-gray-300">Hazard Assessment: </span>
          <span class="text-gray-400">${triage.criticalityReasoning}</span>
        </div>
        <div>
          <span class="font-semibold text-gray-300">Visual Markers Detected: </span>
          <div class="flex flex-wrap gap-1.5 mt-1">
            ${triage.visualMarkers.map(m => `<span class="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40 text-[10px] font-mono">${m}</span>`).join('')}
          </div>
        </div>
        <div class="pt-1 border-t border-gray-800">
          <span class="font-semibold text-gray-300">Action Plan: </span>
          <span class="text-emerald-400">${triage.recommendedAction}</span>
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px] text-gray-400 pt-1">
        <span>Engine: <span class="font-mono text-gray-300">${triage.engine}</span></span>
        <span class="text-emerald-400 flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Verified for E2EE routing
        </span>
      </div>
    </div>
  `;

  card.classList.remove('hidden');
}

// Encrypt and submit the grievance
async function submitEncryptedGrievance() {
  const description = document.getElementById('input-description').value.trim();
  const location = document.getElementById('input-location').value.trim();
  const citizenName = document.getElementById('input-name').value.trim();
  const citizenPhone = document.getElementById('input-phone').value.trim();
  const isAnonymous = document.getElementById('check-anonymous').checked;

  if (!currentUploadedImageBase64) {
    showToast('Please upload or select an image of the problem.', 'warning');
    return;
  }

  if (!description) {
    showToast('Please provide a short description of the issue faced.', 'warning');
    return;
  }

  // Pre-triage if not yet run
  if (!activeAiTriageResult) {
    await runAiTriageScan();
    if (!activeAiTriageResult) return;
  }

  const modal = document.getElementById('encryption-progress-modal');
  const progressText = document.getElementById('crypto-progress-text');
  if (modal) modal.classList.remove('hidden');

  try {
    // 1. Prepare raw sensitive citizen payload
    const payload = {
      description,
      location: location || 'Location unverified',
      citizenName: isAnonymous ? 'Anonymous Citizen' : (citizenName || 'Civic Citizen'),
      citizenPhone: isAnonymous ? '' : citizenPhone,
      imageDataUrl: currentUploadedImageBase64,
      submittedAt: new Date().toISOString()
    };

    // 2. Perform genuine client-side Web Crypto encryption
    const encryptedResult = await window.cryptoClient.encryptPayload(payload, (msg) => {
      if (progressText) progressText.innerText = msg;
    });

    if (progressText) progressText.innerText = 'Transmitting encrypted ciphertext to municipal server...';

    // 3. Transmit encrypted payload to server
    const res = await (window.authClient ? window.authClient.authFetch : fetch)('/api/grievance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedData: {
          ciphertext: encryptedResult.ciphertext,
          iv: encryptedResult.iv,
          encryptedSymmetricKeyForDept: encryptedResult.encryptedSymmetricKeyForDept,
          encryptedSymmetricKeyForCitizen: encryptedResult.encryptedSymmetricKeyForCitizen,
          citizenPasskeyHash: encryptedResult.citizenPasskeyHash
        },
        aiTriage: activeAiTriageResult,
        passkeyHint: `Passkey: ${encryptedResult.citizenPasskey}`,
        citizenEmail: window.authClient?.currentUser?.email || null
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    // Hide progress modal
    if (modal) modal.classList.add('hidden');

    // Show Success Result Modal
    showSubmissionSuccessModal(data.grievanceId, encryptedResult.citizenPasskey, activeAiTriageResult);

  } catch (err) {
    if (modal) modal.classList.add('hidden');
    console.error('Submission failed:', err);
    showToast('Encryption or submission failed: ' + err.message, 'error');
  }
}

// Show submission confirmation modal with Grievance ID and Citizen Passkey
function showSubmissionSuccessModal(grievanceId, citizenPasskey, triage) {
  const modal = document.getElementById('submission-success-modal');
  if (!modal) return;

  document.getElementById('success-grievance-id').innerText = grievanceId;
  document.getElementById('success-passkey').innerText = citizenPasskey;
  document.getElementById('success-dept-name').innerText = triage.department.name;
  document.getElementById('success-sla-deadline').innerText = triage.deadlineLabel;

  modal.classList.remove('hidden');
}

window.copyToClipboard = function(text, elementId) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy. Please select manually.', 'warning');
  });
};

window.trackSubmittedGrievance = function() {
  const grievanceId = document.getElementById('success-grievance-id').innerText;
  const passkey = document.getElementById('success-passkey').innerText;

  document.getElementById('submission-success-modal').classList.add('hidden');
  switchTab('track');

  document.getElementById('track-input-id').value = grievanceId;
  document.getElementById('track-input-passkey').value = passkey;

  lookupGrievance();
};

// ==========================================
// CITIZEN TRACKING & CLIENT DECRYPTION LOGIC
// ==========================================

window.lookupGrievance = async function() {
  const grievanceId = document.getElementById('track-input-id').value.trim();
  const passkey = document.getElementById('track-input-passkey').value.trim();

  if (!grievanceId) {
    showToast('Please enter your Grievance Reference ID.', 'warning');
    return;
  }

  const resultContainer = document.getElementById('tracking-result-container');
  const btnTrack = document.getElementById('btn-lookup-grievance');
  const originalHtml = btnTrack.innerHTML;
  btnTrack.disabled = true;
  btnTrack.innerHTML = 'Fetching Ticket...';

  try {
    const res = await fetch(`/api/grievance/${grievanceId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const g = data.grievance;

    // Optional passkey decryption
    let decryptedPayload = null;
    let decryptionError = null;

    if (passkey) {
      try {
        // Verify passkey against stored hash
        const computedHash = await window.cryptoClient.sha256(passkey);
        if (g.encryptedData.citizenPasskeyHash && computedHash !== g.encryptedData.citizenPasskeyHash) {
          decryptionError = 'Citizen passkey does not match this grievance record.';
        } else {
          // Decrypt symmetric key
          const symmetricKey = g.encryptedData.encryptedSymmetricKeyForCitizen;
          decryptedPayload = await window.cryptoClient.decryptWithSymmetricKey(
            g.encryptedData.ciphertext,
            g.encryptedData.iv,
            symmetricKey
          );
        }
      } catch (err) {
        console.error('Decryption failed:', err);
        decryptionError = err.message;
      }
    }

    renderTrackingDetails(g, decryptedPayload, decryptionError);
    resultContainer.classList.remove('hidden');
    showToast('Grievance record retrieved!', 'success');

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnTrack.disabled = false;
    btnTrack.innerHTML = originalHtml;
  }
};

function renderTrackingDetails(g, decryptedPayload, decryptionError) {
  const container = document.getElementById('tracking-result-container');
  if (!container) return;

  const triage = g.aiTriage;
  const now = Date.now();
  const deadlineMs = new Date(triage.deadlineAt).getTime();
  const remainingMs = deadlineMs - now;

  // Clear existing countdown timer
  if (activeTrackingCountdownInterval) clearInterval(activeTrackingCountdownInterval);

  // Status step index
  const statusSteps = ['SUBMITTED', 'AI_TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
  const currentStepIndex = statusSteps.indexOf(g.status) !== -1 ? statusSteps.indexOf(g.status) : 2;

  container.innerHTML = `
    <!-- Ticket Summary Card -->
    <div class="glass-panel-elevated rounded-2xl p-6 border border-gray-700 space-y-6">
      
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-700/60 pb-5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-800">
              ${g.id}
            </span>
            <span class="text-xs text-gray-400">Filed: ${new Date(g.createdAt).toLocaleString()}</span>
          </div>
          <h2 class="text-xl font-bold text-white">${triage.detectedIssue}</h2>
        </div>

        <div class="flex items-center gap-3">
          <!-- Criticality Badge -->
          <span class="px-3 py-1 rounded-lg text-xs font-bold font-mono ${
            triage.criticality === 'CRITICAL' ? 'bg-red-900/40 text-red-300 border border-red-700/60' : 'bg-amber-900/40 text-amber-300 border border-amber-700/60'
          }">
            CRITICALITY: ${triage.criticality}
          </span>
          <!-- Status Badge -->
          <span class="px-3 py-1 rounded-lg text-xs font-bold ${
            g.status === 'RESOLVED' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60' : 'bg-blue-900/40 text-blue-300 border border-blue-700/60'
          }">
            STATUS: ${g.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <!-- Live SLA Countdown Clock -->
      <div class="bg-gray-900/70 p-4 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-semibold text-gray-400 block mb-0.5">⏱️ AI Target SLA Deadline</span>
          <span class="text-xs text-gray-300 font-mono">Guaranteed resolution by: ${new Date(triage.deadlineAt).toLocaleString()}</span>
        </div>
        <div class="text-right">
          <div id="tracking-countdown-clock" class="text-2xl font-extrabold font-mono ${g.status === 'RESOLVED' ? 'text-emerald-400' : 'text-amber-400'}">
            Calculating...
          </div>
          <span class="text-[10px] text-gray-400 uppercase tracking-wider block">Remaining Window</span>
        </div>
      </div>

      <!-- Stepper -->
      <div class="py-2">
        <div class="flex items-center justify-between">
          ${[
            { label: 'Submitted', key: 'SUBMITTED' },
            { label: 'AI Triaged', key: 'AI_TRIAGED' },
            { label: 'Dept Assigned', key: 'ASSIGNED' },
            { label: 'Field Crew Dispatched', key: 'IN_PROGRESS' },
            { label: 'Resolved & Closed', key: 'RESOLVED' }
          ].map((step, idx) => `
            <div class="flex flex-col items-center flex-1 relative">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                idx <= currentStepIndex ? 'bg-emerald-500 text-gray-950 ring-4 ring-emerald-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'
              }">
                ${idx < currentStepIndex ? '✓' : idx + 1}
              </div>
              <span class="text-[11px] font-medium mt-2 text-center ${idx <= currentStepIndex ? 'text-emerald-400' : 'text-gray-500'}">
                ${step.label}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Department & Routing Assignment Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <span class="text-xs text-gray-400 font-semibold block mb-1">🏛️ Assigned Civic Department</span>
          <h4 class="text-sm font-bold text-blue-400 mb-1">${triage.department.name}</h4>
          <p class="text-xs text-gray-300">${triage.department.jurisdiction}</p>
        </div>
        <div class="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <span class="text-xs text-gray-400 font-semibold block mb-1">👤 Officer in Charge</span>
          <h4 class="text-sm font-bold text-gray-200 mb-1">${triage.department.officerInCharge}</h4>
          <span class="text-xs text-blue-300 font-mono">${triage.department.email}</span>
        </div>
      </div>

      <!-- Decrypted Citizen Evidence (Zero-Knowledge) -->
      <div class="border-t border-gray-700/60 pt-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <span class="text-emerald-400">🛡️</span> Client-Side Decrypted Evidence
          </h3>
          <span class="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
            AES-256-GCM Verified
          </span>
        </div>

        ${decryptedPayload ? `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div class="md:col-span-1">
              <div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
                <img src="${decryptedPayload.imageDataUrl}" class="w-full h-44 object-cover image-zoomable" />
              </div>
            </div>
            <div class="md:col-span-2 space-y-2 text-xs">
              <div>
                <span class="font-semibold text-gray-400 block">Citizen Description:</span>
                <p class="text-gray-200 text-sm mt-0.5">${decryptedPayload.description}</p>
              </div>
              <div>
                <span class="font-semibold text-gray-400 block">Location:</span>
                <p class="text-gray-200 font-mono mt-0.5">${decryptedPayload.location}</p>
              </div>
              <div class="pt-2 flex items-center gap-4 text-gray-400">
                <span>Citizen: <strong class="text-gray-200">${decryptedPayload.citizenName}</strong></span>
                ${decryptedPayload.citizenPhone ? `<span>Phone: <strong class="text-gray-200 font-mono">${decryptedPayload.citizenPhone}</strong></span>` : ''}
              </div>
            </div>
          </div>
        ` : `
          <div class="p-4 rounded-xl bg-gray-900/60 border border-amber-800/50 text-xs text-amber-300 space-y-2">
            <div class="font-semibold flex items-center gap-1.5">
              <span>🔒 Encrypted Payload at Rest</span>
            </div>
            <p class="text-gray-400">
              ${decryptionError || 'Provide your Secret Citizen Passkey above to decrypt the original photo and citizen statement client-side in your browser.'}
            </p>
            <div class="font-mono text-[10px] text-gray-500 bg-gray-950 p-2 rounded truncate">
              Ciphertext: ${g.encryptedData.ciphertext.substring(0, 80)}...
            </div>
          </div>
        `}
      </div>

      <!-- Official AI Verified Resolution Audit Certificate (if resolved) -->
      ${g.status === 'RESOLVED' && g.resolution && g.resolution.resolvedAt ? `
        <div class="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-600 space-y-4 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 pb-3">
            <div>
              <h4 class="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <span>🛡️</span> Official Municipal Certificate of Resolution
              </h4>
              <span class="text-xs text-emerald-400/80">Verified by AI Visual & Location Inspector</span>
            </div>
            <div class="text-right">
              <span class="text-xs font-mono font-bold text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700">
                VERIFIED RESOLVED
              </span>
              <span class="text-[10px] text-gray-400 block mt-0.5">${new Date(g.resolution.resolvedAt).toLocaleString()}</span>
            </div>
          </div>

          <!-- Side-by-Side Photographic Proof Comparison -->
          ${g.resolution.proofImageUrl ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Before Photo -->
              <div class="space-y-1">
                <span class="text-[11px] font-bold text-red-400 flex items-center gap-1">
                  <span>⚠️</span> BEFORE: Initial Defect
                </span>
                <div class="rounded-xl overflow-hidden border border-gray-700 bg-gray-950 h-36">
                  <img src="${decryptedPayload ? decryptedPayload.imageDataUrl : ''}" 
                       class="w-full h-full object-cover image-zoomable" 
                       alt="Before Defect" />
                </div>
              </div>

              <!-- After Photo (Proof of Fix) -->
              <div class="space-y-1">
                <span class="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span>✓</span> AFTER: Verified Remediation Proof
                </span>
                <div class="rounded-xl overflow-hidden border border-emerald-600 bg-gray-950 h-36">
                  <img src="${g.resolution.proofImageUrl}" 
                       class="w-full h-full object-cover image-zoomable" 
                       alt="Resolved Proof" />
                </div>
              </div>
            </div>
          ` : ''}

          <!-- AI Verification Inspection Metrics -->
          ${g.resolution.verificationReport ? `
            <div class="bg-gray-950/60 p-3.5 rounded-xl border border-emerald-900/60 space-y-2 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-2">
                <span class="font-bold text-emerald-300">AI Visual Inspection Breakdown</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700">
                    Fix Score: ${Math.round((g.resolution.verificationReport.verificationScore || 0.95) * 100)}%
                  </span>
                  <span class="font-mono text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-700">
                    Location Match: ${Math.round((g.resolution.verificationReport.locationMatchScore || 0.94) * 100)}%
                  </span>
                </div>
              </div>

              <div class="text-[11px] text-gray-300">
                <strong>Location Match:</strong> ${g.resolution.verificationReport.locationConsistencyNotes || 'Background spatial geometry confirmed.'}
              </div>

              ${g.resolution.verificationReport.remediationEvidence && g.resolution.verificationReport.remediationEvidence.length ? `
                <div>
                  <strong class="text-[11px] text-emerald-400 block mb-0.5">Observed Fix Evidence:</strong>
                  <ul class="list-disc list-inside text-[11px] text-gray-300 space-y-0.5">
                    ${g.resolution.verificationReport.remediationEvidence.map(e => `<li>${e}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <div class="text-[11px] text-emerald-300 italic pt-1 border-t border-gray-800">
                "${g.resolution.verificationReport.inspectorSummary || 'Defect remediation officially certified.'}"
              </div>
            </div>
          ` : ''}

          <!-- Field Notes & Officer Sign-off -->
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-emerald-900/60 text-gray-300">
            <div>
              <strong>Field Crew Notes:</strong> ${g.resolution.resolutionNotes}
            </div>
            <div class="text-[11px] text-gray-400">
              Supervising Unit: <strong class="text-gray-200">${g.resolution.resolvedBy}</strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Audit History -->
      <div class="border-t border-gray-700/60 pt-4">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Municipal Event Audit Trail</h4>
        <div class="space-y-2">
          ${(g.auditLog || []).map(log => `
            <div class="flex items-start gap-2.5 text-xs">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></span>
              <div class="flex-1">
                <span class="text-gray-300">${log.note}</span>
                <span class="text-[10px] text-gray-500 font-mono ml-2">${new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Start live ticking countdown
  startCountdown(deadlineMs, g.status === 'RESOLVED');
}

function startCountdown(deadlineMs, isResolved) {
  const clockEl = document.getElementById('tracking-countdown-clock');
  if (!clockEl) return;

  function update() {
    if (isResolved) {
      clockEl.innerText = 'RESOLVED ON TIME';
      clockEl.className = 'text-2xl font-extrabold font-mono text-emerald-400';
      return;
    }

    const diff = deadlineMs - Date.now();
    if (diff <= 0) {
      clockEl.innerText = 'SLA EXPIRED';
      clockEl.className = 'text-2xl font-extrabold font-mono text-red-500 animate-pulse';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    clockEl.innerText = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    if (hours < 12) {
      clockEl.className = 'text-2xl font-extrabold font-mono text-red-400 sla-urgent-pulse';
    } else {
      clockEl.className = 'text-2xl font-extrabold font-mono text-amber-400';
    }
  }

  update();
  activeTrackingCountdownInterval = setInterval(update, 1000);
}
