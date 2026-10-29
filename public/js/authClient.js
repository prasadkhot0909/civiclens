/**
 * CivicSense AI - Authentication & Role-Based Access Client
 * Manages Citizen (Email Verification + Password) & Department Representative Portals
 */

class AuthClient {
  constructor() {
    this.token = localStorage.getItem('civicsense_token') || null;
    this.currentUser = null;
    this.activePortal = 'citizen'; // 'citizen' or 'department'
    this.pendingVerificationCode = null;
  }

  // Check saved session on app startup
  async checkSession() {
    if (!this.token) {
      this.updateUI();
      return null;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.currentUser = data.user;
        this.activePortal = data.user.role === 'DEPARTMENT' ? 'department' : 'citizen';
      } else {
        this.logout();
      }
    } catch (err) {
      console.warn('[AuthClient] Session verification error:', err);
      this.logout();
    }

    this.updateUI();
    return this.currentUser;
  }

  // Authenticated fetch wrapper
  async authFetch(url, options = {}) {
    if (!options.headers) options.headers = {};
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
      const errorData = await res.clone().json().catch(() => ({}));
      if (res.status === 403) {
        showToast(errorData.error || 'Access Denied: You do not have permission to view this resource.', 'error');
      }
    }
    return res;
  }

  // Send Email Verification Code to citizen
  async sendEmailVerificationCode(email) {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      this.pendingVerificationCode = data.verificationCode;
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // Citizen Login/Register with Email Verification Code & Password
  async citizenVerifyAndLogin(email, verificationCode, password, name = '') {
    try {
      const res = await fetch('/api/auth/citizen-verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verificationCode, password, name })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      this.token = data.token;
      this.currentUser = data.user;
      this.activePortal = 'citizen';
      localStorage.setItem('civicsense_token', this.token);

      this.updateUI();
      showToast(`Email verified! Welcome, ${this.currentUser.name}!`, 'success');
      switchTab('submit');
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // Standard Login (Department Representative or Citizen)
  async login(email, password, portal = 'department') {
    try {
      const cleanEmail = email ? email.trim() : '';
      const cleanPass = password ? password.trim() : '';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, portal })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      this.token = data.token;
      this.currentUser = data.user;
      this.activePortal = data.user.role === 'DEPARTMENT' ? 'department' : 'citizen';
      localStorage.setItem('civicsense_token', this.token);

      this.updateUI();
      showToast(`Welcome, ${this.currentUser.name} (${this.currentUser.role === 'DEPARTMENT' ? this.currentUser.departmentName : 'Citizen'})!`, 'success');

      if (this.currentUser.role === 'DEPARTMENT') {
        switchTab('dept');
      } else {
        switchTab('submit');
      }

      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  // Logout
  async logout() {
    if (this.token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      }).catch(() => {});
    }

    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('civicsense_token');

    this.updateUI();
    showToast('You have been signed out.', 'info');
    switchTab('landing');
  }

  // Update UI navigation, tabs, and role visibility
  updateUI() {
    const userWidget = document.getElementById('auth-user-widget');
    const guestWidget = document.getElementById('auth-guest-widget');
    const portalBadge = document.getElementById('current-portal-badge');
    const deptNavTab = document.getElementById('nav-tab-dept');
    const analyticsNavTab = document.getElementById('nav-tab-analytics');
    const submitNavTab = document.getElementById('nav-tab-submit');
    const myGrievancesNavTab = document.getElementById('nav-tab-my-grievances');
    const trackNavTab = document.getElementById('nav-tab-track');

    if (this.currentUser) {
      // User is LOGGED IN
      if (guestWidget) guestWidget.classList.add('hidden');
      if (userWidget) {
        userWidget.classList.remove('hidden');
        document.getElementById('auth-user-name').innerText = this.currentUser.name;
        document.getElementById('auth-user-role-label').innerText = this.currentUser.role === 'DEPARTMENT' 
          ? (this.currentUser.title || this.currentUser.departmentName)
          : 'Verified Citizen';
      }

      if (this.currentUser.role === 'DEPARTMENT') {
        // DEPARTMENT REPRESENTATIVE VIEW
        if (portalBadge) {
          portalBadge.innerText = '🏛️ Department Portal';
          portalBadge.className = 'text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm';
        }

        // Show Department tabs
        if (deptNavTab) deptNavTab.classList.remove('hidden');
        if (analyticsNavTab) analyticsNavTab.classList.remove('hidden');

        // Hide Citizen-only submission tabs
        if (submitNavTab) submitNavTab.classList.add('hidden');
        if (myGrievancesNavTab) myGrievancesNavTab.classList.add('hidden');
        if (trackNavTab) trackNavTab.classList.add('hidden');

      } else {
        // CITIZEN VIEW
        if (portalBadge) {
          portalBadge.innerText = '👤 Citizen Portal';
          portalBadge.className = 'text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm';
        }

        // Show Citizen tabs
        if (submitNavTab) submitNavTab.classList.remove('hidden');
        if (myGrievancesNavTab) myGrievancesNavTab.classList.remove('hidden');
        if (trackNavTab) trackNavTab.classList.remove('hidden');

        // STRICTLY HIDE DEPARTMENT CONSOLE AND ANALYTICS FOR CITIZENS
        if (deptNavTab) deptNavTab.classList.add('hidden');
        if (analyticsNavTab) analyticsNavTab.classList.add('hidden');
      }

    } else {
      // GUEST / NOT LOGGED IN
      if (userWidget) userWidget.classList.add('hidden');
      if (guestWidget) guestWidget.classList.remove('hidden');

      if (portalBadge) {
        portalBadge.innerText = 'Select Portal';
        portalBadge.className = 'text-[11px] font-semibold text-gray-400 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full';
      }

      // Hide restricted tabs
      if (deptNavTab) deptNavTab.classList.add('hidden');
      if (analyticsNavTab) analyticsNavTab.classList.add('hidden');
      if (myGrievancesNavTab) myGrievancesNavTab.classList.add('hidden');
      if (submitNavTab) submitNavTab.classList.remove('hidden');
      if (trackNavTab) trackNavTab.classList.remove('hidden');
    }
  }
}

// Global auth client
window.authClient = new AuthClient();
