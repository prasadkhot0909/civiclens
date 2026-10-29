/**
 * CivicSense AI - Analytics & Municipal Intelligence Hub
 */

async function initAnalyticsPortal() {
  await loadAnalyticsData();
}

async function loadAnalyticsData() {
  try {
    const res = await window.authClient.authFetch('/api/department/stats');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to load stats');

    const stats = data.stats;

    // Update KPI numbers
    document.getElementById('stat-total-grievances').innerText = stats.total;
    document.getElementById('stat-resolved-count').innerText = stats.resolved;
    document.getElementById('stat-active-count').innerText = stats.inProgress + stats.pending;
    document.getElementById('stat-sla-rate').innerText = `${stats.slaComplianceRate}%`;
    document.getElementById('stat-breached-count').innerText = stats.breachedSlaCount;

    // Draw Department Distribution Chart
    drawDepartmentBarChart(stats.byDept);

    // Draw Criticality Donut Chart
    drawCriticalityChart(stats.byCriticality);

  } catch (err) {
    console.error('Analytics load error:', err);
  }
}

// Draw Department Distribution Bar Chart on HTML5 Canvas
function drawDepartmentBarChart(byDept) {
  const canvas = document.getElementById('chart-dept-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const width = canvas.parentElement.clientWidth;
  const height = 240;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const labels = Object.keys(byDept);
  const values = Object.values(byDept);
  const maxVal = Math.max(...values, 5);

  const colors = ['#3b82f6', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'];
  const barWidth = Math.min(60, (width - 80) / labels.length - 20);

  labels.forEach((label, i) => {
    const val = values[i];
    const x = 50 + i * (barWidth + 30);
    const barHeight = (val / maxVal) * (height - 80);
    const y = height - 40 - barHeight;

    // Bar background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, 20, barWidth, height - 60);

    // Active Bar with rounded top
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
    ctx.fill();

    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(val.toString(), x + barWidth / 2, y - 8);

    // Label text (shortened name)
    const shortLabel = label.split(' ')[0];
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(shortLabel, x + barWidth / 2, height - 20);
  });
}

// Draw Criticality Donut Chart on HTML5 Canvas
function drawCriticalityChart(byCrit) {
  const canvas = document.getElementById('chart-crit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const width = canvas.parentElement.clientWidth;
  const height = 240;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  const items = [
    { label: 'Critical', val: byCrit.CRITICAL || 0, color: '#ef4444' },
    { label: 'High', val: byCrit.HIGH || 0, color: '#f59e0b' },
    { label: 'Medium', val: byCrit.MEDIUM || 0, color: '#3b82f6' },
    { label: 'Low', val: byCrit.LOW || 0, color: '#6b7280' }
  ];

  const total = items.reduce((acc, item) => acc + item.val, 0);
  const centerX = width / 2 - 50;
  const centerY = height / 2;
  const outerRadius = 65;
  const innerRadius = 45;

  let startAngle = -Math.PI / 2;

  if (total === 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 55, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  items.forEach(item => {
    if (item.val === 0) return;
    const sliceAngle = (item.val / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.strokeStyle = item.color;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 55, startAngle + 0.03, endAngle - 0.03);
    ctx.stroke();

    startAngle = endAngle;
  });

  // Total in center
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total.toString(), centerX, centerY - 2);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '9px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CASES', centerX, centerY + 16);

  // Legend
  const legendX = centerX + outerRadius + 30;
  let legendY = 50;

  items.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX, legendY + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.label}: ${item.val}`, legendX + 15, legendY + 9);

    legendY += 32;
  });
}
