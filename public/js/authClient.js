/**
 * CivicSense AI - Authentication & Role-Based Access Client
 * Secure Email & Password Authentication for Citizens & Department Officials
 */

class AuthClient {
  constructor() {
    this.token = localStorage.getItem('civicsense_token') || null;
    this.currentUser = null;
  }

  // Check saved session on app startup
  async checkSession() {
    if (!this.token) {
      this.currentUser = null;
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
      } else {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('civicsense_token');
      }
    } catch (err) {
      console.warn('[AuthClient] Session verification error:', err);
      this.token = null;
      this.currentUser = null;
      localStorage.removeItem('civicsense_token');
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
    if (res.status === 401) {
      this.logout();
      showToast('Session expired. Please sign in again.', 'warning');
    } else if (res.status === 403) {
      const errorData = await res.clone().json().catch(() => ({}));
      showToast(errorData.error || 'Access Denied.', 'error');
    }
    return res;
  }

  // Standard Login (Citizen or Department Representative)
  async login(email, password, portal = null) {
    try {
      const cleanEmail = email ? email.trim() : '';
      const cleanPass = password ? password.trim() : '';

      if (!cleanEmail || !cleanPass) {
        throw new Error('Please enter both your email and password.');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPass, portal })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Login failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('civicsense_token', this.token);

      this.updateUI();
      showToast(`Welcome back, ${this.currentUser.name}!`, 'success');

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

  // Citizen Registration
  async register(name, email, password, phone = '') {
    try {
      const cleanName = name ? name.trim() : '';
      const cleanEmail = email ? email.trim() : '';
      const cleanPass = password ? password.trim() : '';
      const cleanPhone = phone ? phone.trim() : '';

      if (!cleanName || !cleanEmail || !cleanPass) {
        throw new Error('Please enter your name, email, and password.');
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: cleanPass,
          phone: cleanPhone
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Registration failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('civicsense_token', this.token);

      this.updateUI();
      showToast(`Account created! Welcome, ${this.currentUser.name}!`, 'success');
      switchTab('submit');
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
    switchTab('auth');
  }

  // Update UI navigation, tabs, and role visibility
  updateUI() {
    const userWidget = document.getElementById('auth-user-widget');
    const authSection = document.getElementById('section-auth');
    const mainNavBar = document.getElementById('main-nav-bar');
    const portalBadge = document.getElementById('current-portal-badge');
    const deptNavTab = document.getElementById('nav-tab-dept');
    const analyticsNavTab = document.getElementById('nav-tab-analytics');
    const submitNavTab = document.getElementById('nav-tab-submit');
    const myGrievancesNavTab = document.getElementById('nav-tab-my-grievances');
    const trackNavTab = document.getElementById('nav-tab-track');

    if (this.currentUser) {
      // User is LOGGED IN: unlock interface
      if (authSection) authSection.classList.add('hidden');
      if (mainNavBar) mainNavBar.classList.remove('hidden');
      if (userWidget) {
        userWidget.classList.remove('hidden');
        const nameEl = document.getElementById('auth-user-name');
        const roleEl = document.getElementById('auth-user-role-label');
        if (nameEl) nameEl.innerText = this.currentUser.name;
        if (roleEl) {
          roleEl.innerText = this.currentUser.role === 'DEPARTMENT' 
            ? (this.currentUser.title || this.currentUser.departmentName || 'Department Official')
            : 'Citizen';
        }
      }

      if (this.currentUser.role === 'DEPARTMENT') {
        // DEPARTMENT OFFICIAL VIEW
        if (portalBadge) {
          portalBadge.innerText = '🏛️ Department Portal';
          portalBadge.className = 'text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm';
        }

        if (deptNavTab) deptNavTab.classList.remove('hidden');
        if (analyticsNavTab) analyticsNavTab.classList.remove('hidden');
        if (submitNavTab) submitNavTab.classList.add('hidden');
        if (myGrievancesNavTab) myGrievancesNavTab.classList.add('hidden');
        if (trackNavTab) trackNavTab.classList.add('hidden');
      } else {
        // CITIZEN VIEW
        if (portalBadge) {
          portalBadge.innerText = '👤 Citizen Portal';
          portalBadge.className = 'text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm';
        }

        if (submitNavTab) submitNavTab.classList.remove('hidden');
        if (myGrievancesNavTab) myGrievancesNavTab.classList.remove('hidden');
        if (trackNavTab) trackNavTab.classList.remove('hidden');
        if (deptNavTab) deptNavTab.classList.add('hidden');
        if (analyticsNavTab) analyticsNavTab.classList.add('hidden');
      }
    } else {
      // GUEST / NOT LOGGED IN: lock interface
      if (authSection) authSection.classList.remove('hidden');
      if (mainNavBar) mainNavBar.classList.add('hidden');
      if (userWidget) userWidget.classList.add('hidden');

      if (portalBadge) {
        portalBadge.innerText = '🔒 Access Locked';
        portalBadge.className = 'text-[11px] font-semibold text-gray-400 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-full';
      }

      if (deptNavTab) deptNavTab.classList.add('hidden');
      if (analyticsNavTab) analyticsNavTab.classList.add('hidden');
      if (myGrievancesNavTab) myGrievancesNavTab.classList.add('hidden');
      if (submitNavTab) submitNavTab.classList.add('hidden');
      if (trackNavTab) trackNavTab.classList.add('hidden');
    }
  }
}

// Global auth client instance
window.authClient = new AuthClient();
