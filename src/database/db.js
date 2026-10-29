const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/grievances.json');

class Database {
  constructor() {
    this.grievances = [];
    this.init();
  }

  init() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.grievances = JSON.parse(raw);
        console.log(`[DB] Loaded ${this.grievances.length} grievances from storage.`);
        return;
      } catch (err) {
        console.warn('[DB] Failed to parse db file, starting fresh:', err.message);
      }
    }
    this.grievances = [];
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.grievances, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving grievances:', err);
    }
  }

  getAll() {
    return this.grievances;
  }

  getById(id) {
    return this.grievances.find(g => g.id.toLowerCase() === id.toLowerCase());
  }

  getByDepartment(deptId) {
    if (!deptId || deptId === 'all') return this.grievances;
    return this.grievances.filter(g => g.aiTriage && g.aiTriage.department && g.aiTriage.department.id === deptId);
  }

  create(grievance) {
    this.grievances.unshift(grievance);
    this.save();
    return grievance;
  }

  update(id, updates) {
    const index = this.grievances.findIndex(g => g.id.toLowerCase() === id.toLowerCase());
    if (index === -1) return null;

    this.grievances[index] = {
      ...this.grievances[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.status && updates.status !== this.grievances[index].status) {
      if (!this.grievances[index].auditLog) this.grievances[index].auditLog = [];
      this.grievances[index].auditLog.push({
        status: updates.status,
        timestamp: new Date().toISOString(),
        note: updates.statusNote || `Status updated to ${updates.status}`
      });
    }

    this.save();
    return this.grievances[index];
  }

  getStats() {
    const total = this.grievances.length;
    const resolved = this.grievances.filter(g => g.status === 'RESOLVED').length;
    const inProgress = this.grievances.filter(g => g.status === 'IN_PROGRESS').length;
    const pending = total - resolved - inProgress;

    const byDept = {};
    const byCriticality = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    let breachedSlaCount = 0;
    const now = Date.now();

    for (const g of this.grievances) {
      const dept = g.aiTriage?.department?.name || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + 1;

      const crit = g.aiTriage?.criticality || 'MEDIUM';
      if (byCriticality[crit] !== undefined) byCriticality[crit]++;

      if (g.status !== 'RESOLVED' && g.aiTriage?.deadlineAt) {
        if (new Date(g.aiTriage.deadlineAt).getTime() < now) {
          breachedSlaCount++;
        }
      }
    }

    return {
      total,
      resolved,
      inProgress,
      pending,
      breachedSlaCount,
      byDept,
      byCriticality,
      slaComplianceRate: total > 0 ? Math.round(((total - breachedSlaCount) / total) * 100) : 100
    };
  }
}

module.exports = new Database();
