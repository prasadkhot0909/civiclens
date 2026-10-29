/**
 * CivicSense AI - Department Officer Command & Triage Portal
 */

let activeDeptFilter = 'all';
let currentLoadedTickets = [];
let deptCountdownInterval = null;

let currentProofImageBase64 = null;
let currentTicketForResolution = null;

async function initDepartmentPortal() {
  setupDepartmentFilters();
  setupProofUploadHandlers();
  await loadDepartmentTickets();
}

function setupProofUploadHandlers() {
  const dropZone = document.getElementById('proof-drop-zone');
  const fileInput = document.getElementById('proof-file-input');
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleProofFile(file);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-emerald-500', 'bg-emerald-500/10');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-500/10');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-500/10');
    if (e.dataTransfer.files.length > 0) {
      handleProofFile(e.dataTransfer.files[0]);
    }
  });
}

function handleProofFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file (JPEG, PNG, WEBP, or SVG).', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    setProofImage(e.target.result);
  };
  reader.readAsDataURL(file);
}

function setProofImage(dataUrl) {
  currentProofImageBase64 = dataUrl;
  const placeholder = document.getElementById('proof-upload-placeholder');
  const container = document.getElementById('proof-preview-container');
  const img = document.getElementById('proof-image-preview');
  if (placeholder) placeholder.classList.add('hidden');
  if (container) container.classList.remove('hidden');
  if (img) img.src = dataUrl;
  const reportBox = document.getElementById('resolve-ai-report-box');
  if (reportBox) reportBox.classList.add('hidden');
}

window.clearProofImage = function() {
  currentProofImageBase64 = null;
  const placeholder = document.getElementById('proof-upload-placeholder');
  const container = document.getElementById('proof-preview-container');
  const fileInput = document.getElementById('proof-file-input');
  if (fileInput) fileInput.value = '';
  if (placeholder) placeholder.classList.remove('hidden');
  if (container) container.classList.add('hidden');
  const reportBox = document.getElementById('resolve-ai-report-box');
  if (reportBox) reportBox.classList.add('hidden');
};

window.loadSampleProofPhoto = function() {
  if (!currentTicketForResolution) return;

  const issueText = (currentTicketForResolution.aiTriage?.detectedIssue || '').toLowerCase();
  const presets = window.presetsData || [];

  let matchedPreset = presets.find(p => {
    if (issueText.includes('pothole') && p.id === 'pothole') return true;
    if (issueText.includes('waste') && p.id === 'garbage') return true;
    if (issueText.includes('pipeline') && p.id === 'water_leak') return true;
    if (issueText.includes('cable') || issueText.includes('wire') || issueText.includes('electrical')) {
      if (p.id === 'electric_wire') return true;
    }
    return false;
  }) || presets[0];

  if (matchedPreset && matchedPreset.resolvedProofDataUrl) {
    setProofImage(matchedPreset.resolvedProofDataUrl);
    showToast(`Loaded sample proof photo: "${matchedPreset.sampleProofTitle || 'Field Proof'}"`, 'info');
  }
};

function setupDepartmentFilters() {
  const buttons = document.querySelectorAll('.dept-filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white');
        b.classList.add('bg-gray-800/80', 'text-gray-400');
      });
      btn.classList.add('bg-blue-600', 'text-white');
      btn.classList.remove('bg-gray-800/80', 'text-gray-400');

      activeDeptFilter = btn.getAttribute('data-dept');
      loadDepartmentTickets();
    });
  });
}

async function loadDepartmentTickets() {
  const container = document.getElementById('department-tickets-container');
  if (!container) return;

  // Role Gate: Strictly check if logged-in user is a Department Representative
  if (!window.authClient || !window.authClient.currentUser || window.authClient.currentUser.role !== 'DEPARTMENT') {
    container.innerHTML = `
      <div class="glass-panel-elevated p-8 rounded-3xl border border-amber-600/40 text-center max-w-lg mx-auto space-y-4 my-8">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 mx-auto flex items-center justify-center text-2xl">
          🔒
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-white">Department Representative Access Restricted</h3>
          <p class="text-xs text-gray-400">
            The Department Console is strictly reserved for authorized municipal representatives and field response supervisors.
          </p>
        </div>
        <div class="pt-2">
          <button onclick="openDepartmentLoginModal()" 
                  class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition-all">
            Log In as Department Representative →
          </button>
        </div>
      </div>
    `;
    const badge = document.getElementById('dept-ticket-count-badge');
    if (badge) badge.innerText = 'Access Restricted';
    return;
  }

  container.innerHTML = `
    <div class="p-8 text-center text-gray-400">
      <svg class="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      Loading department tickets...
    </div>
  `;

  try {
    const res = await window.authClient.authFetch(`/api/department/tickets?dept=${activeDeptFilter}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    currentLoadedTickets = data.tickets;
    renderDepartmentTickets(currentLoadedTickets);

    // Update count badge
    const badge = document.getElementById('dept-ticket-count-badge');
    if (badge) badge.innerText = `${data.count} Assigned Cases`;

  } catch (err) {
    container.innerHTML = `
      <div class="p-6 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs text-center">
        Failed to load department tickets: ${err.message}
      </div>
    `;
  }
}

function renderDepartmentTickets(tickets) {
  const container = document.getElementById('department-tickets-container');
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-gray-500 glass-panel rounded-2xl">
        <span class="text-3xl block mb-2">🎉</span>
        <h4 class="text-sm font-bold text-gray-300">No active grievances in this queue</h4>
        <p class="text-xs text-gray-500 mt-1">All issues have been dispatched or resolved.</p>
      </div>
    `;
    return;
  }

  // Clear previous intervals
  if (deptCountdownInterval) clearInterval(deptCountdownInterval);

  container.innerHTML = `
    <div class="space-y-4">
      ${tickets.map(ticket => {
        const triage = ticket.aiTriage;
        const critClass = {
          CRITICAL: 'badge-critical',
          HIGH: 'badge-high',
          MEDIUM: 'badge-medium',
          LOW: 'badge-low'
        }[triage.criticality] || 'badge-medium';

        return `
          <div id="ticket-card-${ticket.id}" class="glass-panel-elevated rounded-2xl p-5 border border-gray-700/80 dept-border-${triage.department.id} space-y-4 transition-all">
            
            <!-- Card Top Bar -->
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-800/60">
                    ${ticket.id}
                  </span>
                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded font-mono ${critClass}">
                    ${triage.criticality}
                  </span>
                  <span class="text-[11px] text-gray-400">
                    Filed ${new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 class="text-base font-bold text-white">${triage.detectedIssue}</h3>
                <span class="text-xs text-blue-300 font-semibold block mt-0.5">${triage.department.name}</span>
              </div>

              <!-- SLA Countdown Ticker -->
              <div class="text-right flex-shrink-0 bg-gray-900/80 px-3.5 py-2 rounded-xl border border-gray-800">
                <span class="text-[10px] text-gray-400 uppercase tracking-wider block">SLA Countdown</span>
                <div class="dept-sla-clock text-sm font-extrabold font-mono" 
                     data-deadline="${triage.deadlineAt}" 
                     data-resolved="${ticket.status === 'RESOLVED'}">
                  Calculating...
                </div>
                <span class="text-[10px] text-gray-500">${triage.deadlineLabel}</span>
              </div>
            </div>

            <!-- AI Diagnosis & Visual Markers -->
            <div class="bg-gray-900/40 p-3 rounded-xl border border-gray-800/80 text-xs space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-gray-400">Markers Identified:</span>
                ${(triage.visualMarkers || []).map(m => `
                  <span class="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 text-[10px] font-mono">${m}</span>
                `).join('')}
              </div>
              <div class="text-gray-300">
                <strong class="text-gray-400">AI Hazard Reason:</strong> ${triage.criticalityReasoning}
              </div>
              <div class="text-emerald-400">
                <strong>Field Action Plan:</strong> ${triage.recommendedAction}
              </div>
            </div>

            <!-- Decrypted Evidence Box (Initially Locked) -->
            <div id="decrypted-box-${ticket.id}" class="hidden p-4 rounded-xl bg-gray-900/80 border border-emerald-800/60 space-y-3">
              <!-- Dynamically populated when officer clicks Decrypt -->
            </div>

            <!-- Card Action Footer -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-400">Current Status:</span>
                <span id="ticket-status-badge-${ticket.id}" class="text-xs px-2.5 py-1 rounded font-bold ${
                  ticket.status === 'RESOLVED' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60' : 'bg-amber-900/40 text-amber-300 border border-amber-700/60'
                }">
                  ${ticket.status.replace('_', ' ')}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Decrypt Button -->
                <button id="btn-decrypt-${ticket.id}" onclick="decryptTicketForOfficer('${ticket.id}')"
                        class="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700 flex items-center gap-1.5 transition-colors">
                  <span>🔓</span> Decrypt Citizen Evidence
                </button>

                <!-- Status Update Dropdown / Actions -->
                ${ticket.status !== 'RESOLVED' ? `
                  <button onclick="updateTicketStatus('${ticket.id}', 'IN_PROGRESS')" 
                          class="px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-xs font-semibold text-white transition-colors">
                    Dispatch Crew
                  </button>
                  <button onclick="openResolveModal('${ticket.id}')" 
                          class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors">
                    ✓ Mark Resolved
                  </button>
                ` : `
                  <span class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    ✓ Verified Completed
                  </span>
                `}
              </div>
            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;

  // Start live countdown ticks
  startDepartmentCountdowns();
}

// Live ticking for all tickets in department view
function startDepartmentCountdowns() {
  const clocks = document.querySelectorAll('.dept-sla-clock');

  function update() {
    const now = Date.now();
    clocks.forEach(el => {
      const isResolved = el.getAttribute('data-resolved') === 'true';
      if (isResolved) {
        el.innerText = 'RESOLVED';
        el.className = 'dept-sla-clock text-sm font-extrabold font-mono text-emerald-400';
        return;
      }

      const deadline = new Date(el.getAttribute('data-deadline')).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        el.innerText = 'BREACHED';
        el.className = 'dept-sla-clock text-sm font-extrabold font-mono text-red-500 animate-pulse';
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      el.innerText = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

      if (hours < 12) {
        el.className = 'dept-sla-clock text-sm font-extrabold font-mono text-red-400';
      } else {
        el.className = 'dept-sla-clock text-sm font-extrabold font-mono text-amber-400';
      }
    });
  }

  update();
  deptCountdownInterval = setInterval(update, 1000);
}

// Officer decrypts citizen evidence
window.decryptTicketForOfficer = async function(ticketId) {
  const ticket = currentLoadedTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  const btn = document.getElementById(`btn-decrypt-${ticketId}`);
  const box = document.getElementById(`decrypted-box-${ticketId}`);
  if (!btn || !box) return;

  btn.disabled = true;
  btn.innerHTML = 'Unwrapping RSA Key...';

  try {
    // 1. Send encrypted symmetric key to department unwrap endpoint
    const res = await window.authClient.authFetch('/api/department/decrypt-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedKeyForDept: ticket.encryptedData.encryptedSymmetricKeyForDept
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const symmetricKey = data.symmetricKey;

    btn.innerHTML = 'Decrypting AES Payload...';

    // 2. Decrypt ciphertext client-side using WebCrypto
    const decryptedPayload = await window.cryptoClient.decryptWithSymmetricKey(
      ticket.encryptedData.ciphertext,
      ticket.encryptedData.iv,
      symmetricKey
    );

    // Cache decrypted payload on ticket object
    ticket.decryptedPayload = decryptedPayload;

    // 3. Render decrypted evidence
    box.innerHTML = `
      <div class="flex items-center justify-between border-b border-gray-800 pb-2">
        <h4 class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
          <span>🛡️</span> Decrypted Citizen Evidence (Verified by Master RSA Key)
        </h4>
        <span class="text-[10px] font-mono text-gray-400">Zero-Knowledge Decrypted in Browser</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div class="md:col-span-1">
          <div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
            <img src="${decryptedPayload.imageDataUrl}" class="w-full h-40 object-cover image-zoomable" />
          </div>
        </div>
        <div class="md:col-span-2 space-y-2 text-xs">
          <div>
            <span class="font-semibold text-gray-400 block">Citizen Description:</span>
            <p class="text-gray-100 mt-0.5 text-sm">${decryptedPayload.description}</p>
          </div>
          <div>
            <span class="font-semibold text-gray-400 block">Location Coordinates / Landmark:</span>
            <p class="text-blue-300 font-mono mt-0.5">${decryptedPayload.location}</p>
          </div>
          <div class="pt-1 flex items-center gap-4 text-gray-400">
            <span>Complainant: <strong class="text-gray-200">${decryptedPayload.citizenName}</strong></span>
            ${decryptedPayload.citizenPhone ? `<span>Contact: <strong class="text-gray-200 font-mono">${decryptedPayload.citizenPhone}</strong></span>` : ''}
          </div>
        </div>
      </div>
    `;

    box.classList.remove('hidden');
    btn.innerHTML = '✓ Decrypted';
    btn.classList.add('text-emerald-400', 'border-emerald-700');
    showToast(`Decrypted evidence for ${ticketId} using Department RSA Key.`, 'success');

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '🔓 Decrypt Citizen Evidence';
    showToast('Department decryption failed: ' + err.message, 'error');
  }
};

// Dispatch crew (Mark in progress)
window.updateTicketStatus = async function(ticketId, status) {
  try {
    const res = await window.authClient.authFetch('/api/department/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grievanceId: ticketId,
        status
      })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    showToast(`Ticket ${ticketId} status updated to ${status}.`, 'success');
    loadDepartmentTickets();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
};

// Open resolution modal with mandatory proof upload and before photo
window.openResolveModal = function(ticketId) {
  const modal = document.getElementById('resolve-ticket-modal');
  if (!modal) return;

  const ticket = currentLoadedTickets.find(t => t.id === ticketId);
  currentTicketForResolution = ticket || null;

  document.getElementById('resolve-ticket-id-display').innerText = ticketId;
  document.getElementById('resolve-ticket-id-input').value = ticketId;
  document.getElementById('resolve-notes-input').value = '';
  document.getElementById('resolve-officer-input').value = ticket?.aiTriage?.department?.officerInCharge || '';

  // Set issue title
  const issueTitleEl = document.getElementById('resolve-issue-title-display');
  if (issueTitleEl) issueTitleEl.innerText = ticket?.aiTriage?.detectedIssue || 'Defect';

  // Display Before photo
  const beforeImg = document.getElementById('resolve-before-preview');
  const beforePlaceholder = document.getElementById('resolve-before-placeholder');
  const beforeHidden = document.getElementById('resolve-before-image-hidden');

  let beforeUrl = ticket?.decryptedPayload?.imageDataUrl || '';
  if (!beforeUrl) {
    // Check if preset matches
    const issueText = (ticket?.aiTriage?.detectedIssue || '').toLowerCase();
    const presets = window.presetsData || [];
    const matched = presets.find(p => {
      if (issueText.includes('pothole') && p.id === 'pothole') return true;
      if (issueText.includes('waste') && p.id === 'garbage') return true;
      if (issueText.includes('pipeline') && p.id === 'water_leak') return true;
      if ((issueText.includes('cable') || issueText.includes('wire')) && p.id === 'electric_wire') return true;
      return false;
    });
    if (matched) beforeUrl = matched.imageDataUrl;
  }

  if (beforeUrl && beforeImg) {
    beforeImg.src = beforeUrl;
    beforeImg.classList.remove('hidden');
    if (beforePlaceholder) beforePlaceholder.classList.add('hidden');
    if (beforeHidden) beforeHidden.value = beforeUrl;
  } else {
    if (beforeImg) beforeImg.classList.add('hidden');
    if (beforePlaceholder) {
      beforePlaceholder.classList.remove('hidden');
      beforePlaceholder.innerText = 'Evidence encrypted at rest. Unlocked during verification.';
    }
    if (beforeHidden) beforeHidden.value = '';
  }

  // Reset proof image and AI report box
  clearProofImage();
  const reportBox = document.getElementById('resolve-ai-report-box');
  if (reportBox) reportBox.classList.add('hidden');

  modal.classList.remove('hidden');
};

window.closeResolveModal = function() {
  const modal = document.getElementById('resolve-ticket-modal');
  if (modal) modal.classList.add('hidden');
  currentProofImageBase64 = null;
  currentTicketForResolution = null;
};

// Perform AI Visual Verification & Close Ticket
window.verifyAndCloseTicket = async function() {
  const ticketId = document.getElementById('resolve-ticket-id-input').value;
  const notes = document.getElementById('resolve-notes-input').value.trim();
  const officerName = document.getElementById('resolve-officer-input').value.trim();
  const beforeImage = document.getElementById('resolve-before-image-hidden').value;

  if (!currentProofImageBase64) {
    showToast('Mandatory Resolution Photo Missing! You must upload or select a proof photo.', 'warning');
    return;
  }

  if (!notes) {
    showToast('Please provide brief field rectification notes.', 'warning');
    return;
  }

  const btnVerify = document.getElementById('btn-verify-resolve');
  const reportBox = document.getElementById('resolve-ai-report-box');
  const originalHtml = btnVerify.innerHTML;

  btnVerify.disabled = true;
  btnVerify.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    Scanning Before & After Photos with AI...
  `;

  // Show live inspection report in progress
  reportBox.className = 'p-4 rounded-2xl bg-blue-950/40 border border-blue-800 text-xs text-blue-200 space-y-2';
  reportBox.innerHTML = `
    <div class="flex items-center gap-2 font-bold">
      <span class="animate-pulse">🔍</span> AI Image Analysis in Progress...
    </div>
    <p class="text-[11px] text-gray-300">Comparing Before & After spatial landmarks, background curb lines, and defect remediation quality.</p>
  `;
  reportBox.classList.remove('hidden');

  try {
    const res = await window.authClient.authFetch('/api/department/verify-resolution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grievanceId: ticketId,
        proofImageBase64: currentProofImageBase64,
        resolutionNotes: notes,
        resolvedBy: officerName || 'Municipal Field Squad',
        beforeImageBase64: beforeImage
      })
    });

    const data = await res.json();

    if (!data.success || !data.verified) {
      // AI Verification REJECTED!
      const report = data.report || {};
      reportBox.className = 'p-4 rounded-2xl bg-red-950/60 border border-red-700 text-xs text-red-200 space-y-3';
      reportBox.innerHTML = `
        <div class="flex items-center justify-between border-b border-red-800/80 pb-2">
          <div class="flex items-center gap-2 font-bold text-red-300">
            <span>❌</span> AI Verification REJECTED: Remediation Not Confirmed
          </div>
          <span class="font-mono text-[10px] bg-red-900/80 px-2 py-0.5 rounded text-red-200">Confidence: ${Math.round((report.verificationScore || 0) * 100)}%</span>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-red-100 font-semibold">${data.error || 'The defect remains visible or proof photo does not match site.'}</p>
          ${report.residualIssues && report.residualIssues.length ? `
            <div class="text-[11px] text-red-300">
              <strong>Residual Hazards Detected:</strong> ${report.residualIssues.join(', ')}
            </div>
          ` : ''}
        </div>
        <div class="text-[10px] text-gray-400 border-t border-red-900/50 pt-2 font-mono">
          Engine: ${report.engine || 'Built-in Verification Inspector'} • Ticket remains IN_PROGRESS.
        </div>
      `;
      showToast('AI Verification Rejected: Problem not certified as resolved!', 'error');
      btnVerify.disabled = false;
      btnVerify.innerHTML = originalHtml;
      return;
    }

    // AI Verification PASSED & VERIFIED!
    const report = data.report;
    reportBox.className = 'p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600 text-xs text-emerald-200 space-y-3 shadow-lg';
    reportBox.innerHTML = `
      <div class="flex items-center justify-between border-b border-emerald-800/80 pb-2">
        <div class="flex items-center gap-2 font-bold text-emerald-300">
          <span>✓</span> AI Verification Confirmed & Certified
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded border border-emerald-700">
            Fix Score: ${Math.round(report.verificationScore * 100)}%
          </span>
          <span class="font-mono text-[10px] bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-700">
            Location Match: ${Math.round(report.locationMatchScore * 100)}%
          </span>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-[11px] text-gray-200">
          <strong>Location Consistency:</strong> ${report.locationConsistencyNotes}
        </div>
        <div>
          <strong class="text-[11px] text-emerald-300 block mb-1">Remediation Evidence Verified by AI:</strong>
          <ul class="list-disc list-inside space-y-0.5 text-[11px] text-gray-300">
            ${(report.remediationEvidence || []).map(ev => `<li>${ev}</li>`).join('')}
          </ul>
        </div>
        <div class="text-xs text-emerald-400 font-semibold pt-1 border-t border-emerald-900/60">
          "${report.inspectorSummary}"
        </div>
      </div>

      <div class="text-[10px] text-gray-400 pt-1 border-t border-emerald-900/40 flex items-center justify-between font-mono">
        <span>Verified by: ${report.engine}</span>
        <span class="text-emerald-400 font-bold">TICKET OFFICIALLY CLOSED</span>
      </div>
    `;

    showToast('Proof verified by AI! Grievance closed successfully.', 'success');

    // Automatically close modal after brief visual confirmation
    setTimeout(() => {
      closeResolveModal();
      loadDepartmentTickets();
    }, 2000);

  } catch (err) {
    reportBox.className = 'p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300';
    reportBox.innerText = 'Verification request failed: ' + err.message;
    showToast('Failed to verify proof: ' + err.message, 'error');
    btnVerify.disabled = false;
    btnVerify.innerHTML = originalHtml;
  }
};
