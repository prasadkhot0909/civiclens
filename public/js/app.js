/**
 * CivicSense AI - Application Controller & Role-Based Navigation
 * Enforced Authentication Barrier & Portal Switching
 */

let activeTab = 'auth';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[CivicSense AI] App Initializing...');

  // 1. Initialize Auth Client session
  if (window.authClient) {
    await window.authClient.checkSession();
  }

  // 2. Initialize Web Crypto client
  try {
    if (window.cryptoClient && typeof window.cryptoClient.loadDepartmentPublicKey === 'function') {
      await window.cryptoClient.loadDepartmentPublicKey();
      const fpEl = document.getElementById('e2ee-key-fingerprint');
      if (fpEl) fpEl.innerText = window.cryptoClient.departmentKeyFingerprint;
    }
  } catch (e) {
    console.warn('Could not load department public key on startup:', e.message);
  }

  // 3. Initialize navigation & auth gateway forms
  initTabNavigation();
  initAuthGateway();

  // 4. Initialize portal modules
  if (typeof initCitizenPortal === 'function') initCitizenPortal();
  if (typeof initDepartmentPortal === 'function') initDepartmentPortal();
  if (typeof initAnalyticsPortal === 'function') initAnalyticsPortal();

  // 5. Query AI engine status (code-configured)
  checkAiStatus();

  // 6. Direct user based on authentication status
  if (window.authClient && window.authClient.currentUser) {
    if (window.authClient.currentUser.role === 'DEPARTMENT') {
      switchTab('dept');
    } else {
      switchTab('submit');
    }
  } else {
    // Lock into authentication gate
    switchTab('auth');
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
  const user = window.authClient?.currentUser;

  // Strict Authentication Gate: User cannot view or access any portal without signing in
  if (!user) {
    targetTab = 'auth';
  } else if (targetTab === 'auth') {
    targetTab = user.role === 'DEPARTMENT' ? 'dept' : 'submit';
  }

  // Role Gate: Restrict Department Console & City Analytics exclusively to Department Representatives
  if (targetTab === 'dept' || targetTab === 'analytics') {
    if (!user || user.role !== 'DEPARTMENT') {
      showToast('Access Denied: Restricted exclusively to authorized Department Representatives.', 'error');
      return;
    }
  }

  activeTab = targetTab;

  // Update nav buttons active states
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

  // Load section-specific data
  if (targetTab === 'my-grievances' && typeof loadMyGrievances === 'function') {
    loadMyGrievances();
  }
  if (targetTab === 'dept' && typeof loadDepartmentTickets === 'function') {
    loadDepartmentTickets();
  }
  if (targetTab === 'analytics' && typeof loadAnalyticsData === 'function') {
    loadAnalyticsData();
  }
};

window.onLogoClick = function() {
  const user = window.authClient?.currentUser;
  if (!user) {
    switchTab('auth');
  } else if (user.role === 'DEPARTMENT') {
    switchTab('dept');
  } else {
    switchTab('submit');
  }
};

// ================= AUTHENTICATION GATEWAY CONTROLLER =================

function initAuthGateway() {
  // Sign In Form
  const loginForm = document.getElementById('form-gate-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearGateError();

      const emailInput = document.getElementById('gate-login-email');
      const passInput = document.getElementById('gate-login-password');
      const submitBtn = document.getElementById('btn-gate-login-submit');

      const email = emailInput ? emailInput.value.trim() : '';
      const pass = passInput ? passInput.value.trim() : '';

      if (!email || !pass) {
        showGateError('Please enter both your email address and password.');
        return;
      }

      const originalHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg> Verifying Credentials...
        `;
      }

      try {
        await window.authClient.login(email, pass);
        // Form reset on success
        loginForm.reset();
      } catch (err) {
        showGateError(err.message || 'Invalid email or password.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
      }
    });
  }

  // Registration Form
  const regForm = document.getElementById('form-gate-register');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearGateError();

      const nameInput = document.getElementById('gate-reg-name');
      const emailInput = document.getElementById('gate-reg-email');
      const phoneInput = document.getElementById('gate-reg-phone');
      const passInput = document.getElementById('gate-reg-password');
      const submitBtn = document.getElementById('btn-gate-reg-submit');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const pass = passInput ? passInput.value.trim() : '';

      if (!name || !email || !pass) {
        showGateError('Please fill in your name, email, and password.');
        return;
      }

      if (pass.length < 6) {
        showGateError('Password must be at least 6 characters long.');
        return;
      }

      const originalHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-white inline-block mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg> Creating Account...
        `;
      }

      try {
        await window.authClient.register(name, email, pass, phone);
        regForm.reset();
      } catch (err) {
        showGateError(err.message || 'Registration failed.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        }
      }
    });
  }
}

// Switch between Sign In and Create Account on the Auth Gate
window.setAuthGateMode = function(mode) {
  clearGateError();

  const tabSignIn = document.getElementById('gate-tab-signin');
  const tabRegister = document.getElementById('gate-tab-register');
  const formSignIn = document.getElementById('form-gate-login');
  const formRegister = document.getElementById('form-gate-register');

  if (mode === 'register') {
    if (tabRegister) {
      tabRegister.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-all';
    }
    if (tabSignIn) {
      tabSignIn.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 transition-all';
    }
    if (formRegister) formRegister.classList.remove('hidden');
    if (formSignIn) formSignIn.classList.add('hidden');
  } else {
    if (tabSignIn) {
      tabSignIn.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-all';
    }
    if (tabRegister) {
      tabRegister.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 transition-all';
    }
    if (formSignIn) formSignIn.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');
  }
};

window.toggleGatePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

function showGateError(msg) {
  const errBox = document.getElementById('gate-auth-error');
  const errText = document.getElementById('gate-auth-error-text');
  if (errBox && errText) {
    errText.innerText = msg;
    errBox.classList.remove('hidden');
  }
  showToast(msg, 'error');
}

function clearGateError() {
  const errBox = document.getElementById('gate-auth-error');
  if (errBox) errBox.classList.add('hidden');
}

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

// Query backend AI status (purely code/env configured)
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
