const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../../data/users.json');

// In-memory active session tokens
const sessions = new Map();

function hashPassword(password, salt = 'civic_salt_2026') {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const computed = hashPassword(password);
  const bufA = Buffer.from(computed, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

class AuthManager {
  constructor() {
    this.users = [];
    this.init();
  }

  init() {
    if (fs.existsSync(USERS_FILE)) {
      try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        this.users = JSON.parse(raw);
        console.log(`[Auth] Loaded ${this.users.length} users from storage.`);
        return;
      } catch (err) {
        console.warn('[Auth] Failed to load users, re-initializing defaults:', err.message);
      }
    }

    // Default Pre-Configured Users (Citizen & Department Representatives)
    this.users = [
      // 1. Citizens
      {
        id: 'usr_cit_001',
        email: 'citizen@civic.gov',
        passwordHash: hashPassword('citizen123'),
        name: 'Aarav Mehta',
        phone: '+91 98200 45112',
        role: 'CITIZEN',
        departmentId: null,
        departmentName: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_cit_002',
        email: 'priya.sharma@civic.gov',
        passwordHash: hashPassword('citizen123'),
        name: 'Priya Sharma',
        phone: '+91 98765 43210',
        role: 'CITIZEN',
        departmentId: null,
        departmentName: null,
        createdAt: new Date().toISOString()
      },

      // 2. Department Representatives
      {
        id: 'usr_dept_road',
        email: 'roads@city.gov',
        passwordHash: hashPassword('roads123'),
        name: 'Er. R. Sharma',
        role: 'DEPARTMENT',
        departmentId: 'road_admin',
        departmentName: 'Road Administration & Transport Department',
        title: 'Chief Maintenance Engineer',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_dept_waste',
        email: 'sanitation@city.gov',
        passwordHash: hashPassword('waste123'),
        name: 'Dr. A. Verma',
        role: 'DEPARTMENT',
        departmentId: 'municipal_corp',
        departmentName: 'Municipal Solid Waste & Sanitation Corporation',
        title: 'Sanitation Commissioner',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_dept_water',
        email: 'water@city.gov',
        passwordHash: hashPassword('water123'),
        name: 'Er. K. Nair',
        role: 'DEPARTMENT',
        departmentId: 'water_board',
        departmentName: 'Water Supply & Sewerage Board',
        title: 'Executive Hydraulic Engineer',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_dept_power',
        email: 'power@city.gov',
        passwordHash: hashPassword('power123'),
        name: 'Chief Inspector M. Patel',
        role: 'DEPARTMENT',
        departmentId: 'power_board',
        departmentName: 'Electricity & Public Infrastructure Board',
        title: 'Grid Safety Division Head',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_dept_admin',
        email: 'admin@city.gov',
        passwordHash: hashPassword('admin123'),
        name: 'Commissioner V. Rao',
        role: 'DEPARTMENT',
        departmentId: 'all',
        departmentName: 'Central Municipal Administration',
        title: 'City Commissioner (Super Admin)',
        createdAt: new Date().toISOString()
      }
    ];

    this.save();
    console.log(`[Auth] Initialized ${this.users.length} pre-configured portal users.`);
  }

  save() {
    try {
      const dir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Auth] Error saving users:', err);
    }
  }

  findByEmail(email) {
    if (!email) return null;
    return this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  registerCitizen({ email, password, name, phone }) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPass = password ? password.trim() : '';
    const cleanName = name ? name.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    if (!cleanEmail || !cleanPass || !cleanName) {
      throw new Error('Please provide your name, email, and password.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address (e.g. name@example.com).');
    }

    if (cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (this.findByEmail(cleanEmail)) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    const newUser = {
      id: `usr_cit_${Date.now()}`,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPass),
      name: cleanName,
      phone: cleanPhone,
      role: 'CITIZEN',
      departmentId: null,
      departmentName: null,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.save();
    return this.createSession(newUser);
  }

  login(email, password, requiredRole = null) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPass = password ? password.trim() : '';

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both your email address and password.');
    }

    const user = this.findByEmail(cleanEmail);
    if (!user || !verifyPassword(cleanPass, user.passwordHash)) {
      throw new Error('Invalid email or password. Please verify and try again.');
    }

    if (requiredRole && user.role !== requiredRole) {
      if (requiredRole === 'DEPARTMENT') {
        throw new Error('Access Denied: This account is a Citizen account, not an authorized Department Representative.');
      } else if (requiredRole === 'CITIZEN') {
        throw new Error('This account belongs to a Department Official. Please sign in through the Department Portal.');
      }
    }

    return this.createSession(user);
  }

  createSession(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
        title: user.title || ''
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000 // 7 days
    };

    sessions.set(token, sessionData);
    return sessionData;
  }

  getSession(token) {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session;
  }

  destroySession(token) {
    if (token) sessions.delete(token);
  }
}

const authManager = new AuthManager();

// Express Middleware to authenticate bearer token
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to proceed.'
    });
  }

  const token = authHeader.split(' ')[1];
  const session = authManager.getSession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please log in again.'
    });
  }

  req.user = session.user;
  req.token = token;
  next();
}

// Optional Auth (populates req.user if token is present, but does not block)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = authManager.getSession(token);
    if (session) {
      req.user = session.user;
      req.token = token;
    }
  }
  next();
}

// Middleware: Restrict access exclusively to Department Representatives
function requireDepartment(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'DEPARTMENT') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: The Department Console is strictly restricted to authorized Department Representatives.'
      });
    }
    next();
  });
}

// Middleware: Restrict access exclusively to Citizens
function requireCitizen(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'CITIZEN') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: This action requires a Citizen account.'
      });
    }
    next();
  });
}

module.exports = {
  authManager,
  requireAuth,
  optionalAuth,
  requireDepartment,
  requireCitizen
};
