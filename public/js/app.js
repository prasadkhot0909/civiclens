/**
 * CivicSense AI - Application Controller & 2-Portal Navigation
 */

let activeTab = 'submit';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[CivicSense AI] App Initializing...');

  // 1. Initialize Auth Client session
  if (window.authClient) {
    await window.authClient.checkSession();
  }

  // 2. Initialize Web Crypto client
  try {
    await window.cryptoClient.loadDepartmentPublicKey();
    const fpEl = document.getElementById('e2ee-key-fingerprint');
    if (fpEl) fpEl.innerText = window.cryptoClient.departmentKeyFingerprint;
  } catch (e) {
    console.warn('Could not load department public key on startup:', e.message);
  }

  // 3. Initialize tabs & auth modals
  initTabNavigation();
  initAuthModals();

  // 4. Initialize views
  if (typeof initCitizenPortal === 'function') initCitizenPortal();
  if (typeof initDepartmentPortal === 'function') initDepartmentPortal();
  if (typeof initAnalyticsPortal === 'function') initAnalyticsPortal();

  // 5. Setup settings modal
  setupSettingsModal();

  // 6. Check AI engine status
  checkAiStatus();

  // Default initial tab based on role
  if (window.authClient && window.authClient.currentUser) {
    if (window.authClient.currentUser.role === 'DEPARTMENT') {
      switchTab('dept');
    } else {
      switchTab('submit');
    }
  } else {
    // Show landing portal selection if guest
    switchTab('landing');
  }

  window.addEventListener('resize', () => {
    if (activeTab === 'analytics' && typeof loadAnalyticsData === 'function') {
      loadAnalyticsData();
    }
  });
});

function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

window.switchTab = function(targetTab) {
  // Access Control Gates
  if (targetTab === 'dept' || targetTab === 'analytics') {
    const user = window.authClient?.currentUser;
    if (!user || user.role !== 'DEPARTMENT') {
      showToast('Access Denied: The Department Console is restricted to authorized Department Representatives.', 'error');
      openDepartmentLoginModal();
      return;
    }
  }

  activeTab = targetTab;

  // Update nav buttons
  const buttons = document.querySelectorAll('.nav-tab-btn');
  buttons.forEach(b => {
    const isTarget = b.getAttribute('data-tab') === targetTab;
    if (isTarget) {
      b.classList.add('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/30');
      b.classList.remove('text-gray-400', 'hover:text-gray-200');
    } else {
      b.classList.remove('bg-blue-600', 'text-white', 'shadow-lg', 'shadow-blue-600/30');
      b.classList.add('text-gray-400', 'hover:text-gray-200');
    }
  });

  // Switch visible section
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => {
    if (s.id === `section-${targetTab}`) {
      s.classList.remove('hidden');
    } else {
      s.classList.add('hidden');
    }
  });

  // Trigger reloads on tab focus
  if (targetTab === 'dept' && typeof loadDepartmentTickets === 'function') {
    loadDepartmentTickets();
  } else if (targetTab === 'analytics' && typeof loadAnalyticsData === 'function') {
    setTimeout(loadAnalyticsData, 100);
  } else if (targetTab === 'my-grievances' && typeof loadMyGrievances === 'function') {
    loadMyGrievances();
  }
};

// ==========================================
// 2-PORTAL AUTHENTICATION MODALS & CONTROLS
// ==========================================

function initAuthModals() {
  // Citizen login form submit (Email Verification Code + Password)
  const citizenForm = document.getElementById('citizen-login-form');
  if (citizenForm) {
    citizenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('citizen-login-email').value.trim();
      const code = document.getElementById('citizen-verify-code').value.trim();
      const pass = document.getElementById('citizen-login-password').value.trim();

      if (!code) {
        showToast('Please request and enter your 6-digit email verification code.', 'warning');
        return;
      }

      try {
        await window.authClient.citizenVerifyAndLogin(email, code, pass);
        closeAuthModal();
      } catch (err) {
        // error already toasted in authClient
      }
    });
  }

  // Citizen register form submit
  const registerForm = document.getElementById('citizen-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const pass = document.getElementById('reg-password').value.trim();
      try {
        await window.authClient.register(email, pass, name, phone);
        closeAuthModal();
      } catch (err) {}
    });
  }

  // Department login form submit
  const deptForm = document.getElementById('department-login-form');
  if (deptForm) {
    deptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('dept-login-email').value.trim();
      const pass = document.getElementById('dept-login-password').value.trim();
      try {
        await window.authClient.login(email, pass, 'department');
        closeAuthModal();
      } catch (err) {}
    });
  }
}

// Citizen Email Verification Code Dispatcher
window.requestCitizenVerificationCode = async function() {
  const emailInput = document.getElementById('citizen-login-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address first.', 'warning');
    return;
  }

  const btnSend = document.getElementById('btn-send-citizen-code');
  const originalHtml = btnSend ? btnSend.innerHTML : '';
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.innerText = 'Sending...';
  }

  try {
    const data = await window.authClient.sendEmailVerificationCode(email);
    const banner = document.getElementById('citizen-code-banner');
    const display = document.getElementById('citizen-sent-code-display');
    if (banner && display) {
      display.innerText = data.verificationCode;
      banner.classList.remove('hidden');
    }
    showToast(`Verification code sent to ${email}: [ ${data.verificationCode} ]`, 'success');
  } catch (err) {
    // error handled
  } finally {
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.innerText = 'Resend Code';
    }
  }
};

window.autofillCitizenCode = function() {
  const code = window.authClient?.pendingVerificationCode || '123456';
  const codeInput = document.getElementById('citizen-verify-code');
  if (codeInput) {
    codeInput.value = code;
    showToast(`Verification code [ ${code} ] auto-filled!`, 'info');
  }
};

// Department Preset Selector (Dropdown change handler)
window.onDepartmentPresetSelect = function(presetKey) {
  const presets = {
    roads: { email: 'roads@city.gov', pass: 'roads123' },
    sanitation: { email: 'sanitation@city.gov', pass: 'waste123' },
    water: { email: 'water@city.gov', pass: 'water123' },
    power: { email: 'power@city.gov', pass: 'power123' },
    admin: { email: 'admin@city.gov', pass: 'admin123' }
  };

  const selected = presets[presetKey];
  if (!selected) return;

  const emailInput = document.getElementById('dept-login-email');
  const passInput = document.getElementById('dept-login-password');
  if (emailInput) emailInput.value = selected.email;
  if (passInput) passInput.value = selected.pass;

  showToast(`Auto-selected: ${selected.email}`, 'info');
};

window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

window.openCitizenLoginModal = function() {
  closeAuthModal();
  document.getElementById('citizen-login-modal').classList.remove('hidden');
};

window.openDepartmentLoginModal = function() {
  closeAuthModal();
  document.getElementById('department-login-modal').classList.remove('hidden');
};

window.openCitizenRegisterModal = function() {
  closeAuthModal();
  document.getElementById('citizen-register-modal').classList.remove('hidden');
};

window.closeAuthModal = function() {
  const modals = [
    'citizen-login-modal',
    'department-login-modal',
    'citizen-register-modal'
  ];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
};

// Quick 1-Click Demo Logins
window.quickLoginCitizen = async function(email = 'citizen@civic.gov') {
  try {
    // Generate code & verify login seamlessly in 1 click
    await window.authClient.citizenVerifyAndLogin(email, '123456', 'citizen123', 'Aarav Mehta');
    closeAuthModal();
  } catch (err) {
    showToast('Login failed: ' + err.message, 'error');
  }
};

window.quickLoginDept = async function(email, pass) {
  try {
    await window.authClient.login(email, pass, 'department');
    closeAuthModal();
  } catch (err) {
    showToast('Login failed: ' + err.message, 'error');
  }
};

window.userLogout = function() {
  window.authClient.logout();
};

// Toast Notifications
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const typeStyles = {
    success: 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200',
    error: 'bg-red-950/90 border-red-700/80 text-red-200',
    warning: 'bg-amber-950/90 border-amber-700/80 text-amber-200',
    info: 'bg-blue-950/90 border-blue-700/80 text-blue-200'
  }[type] || 'bg-gray-900 border-gray-700 text-gray-200';

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || '•';

  toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 transform translate-y-2 opacity-0 ${typeStyles}`;
  toast.innerHTML = `<span class="font-bold">${icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Settings Modal
function setupSettingsModal() {
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const saveBtn = document.getElementById('btn-save-settings');
  const modal = document.getElementById('settings-modal');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  }
  if (saveBtn && modal) {
    saveBtn.addEventListener('click', async () => {
      const apiKey = document.getElementById('input-gemini-key').value.trim();
      try {
        const res = await fetch('/api/ai/set-api-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await res.json();
        showToast(data.message, data.hasCustomKey ? 'success' : 'info');
        checkAiStatus();
        modal.classList.add('hidden');
      } catch (err) {
        showToast('Failed to save settings: ' + err.message, 'error');
      }
    });
  }
}

async function checkAiStatus() {
  try {
    const res = await fetch('/api/ai/status');
    const data = await res.json();
    const badge = document.getElementById('ai-engine-status-badge');
    if (badge) {
      badge.innerText = data.activeEngine;
      if (data.hasKey) {
        badge.className = 'text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5';
      } else {
        badge.className = 'text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800 flex items-center gap-1.5';
      }
    }
  } catch (err) {
    console.error('Failed to check AI status:', err);
  }
}
