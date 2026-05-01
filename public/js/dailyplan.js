/* ──────────────────────────────────────────
   HealthPulse · daily-plan.js
   Handles: auth guard, user init, plan
            generation, shimmer, render
   ────────────────────────────────────────── */

/* ── Auth guard ── */
const token = localStorage.getItem('hp_token');
const role  = localStorage.getItem('hp_role');
const name  = localStorage.getItem('hp_name');
if (!token || role !== 'patient') window.location.href = '/index.html';

/* ── Populate user chip ── */
if (name) {
  document.getElementById('userName').textContent   = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
}

/* ── Module state ── */
let userProfile = {};

/* ── Initialise page ── */
async function init() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('Profile fetch failed');
    userProfile = await res.json();

    const surgery   = userProfile.surgeryDate
      ? new Date(userProfile.surgeryDate.split('T')[0] + 'T12:00:00')
      : null;
    const daysSince = surgery
      ? Math.floor((Date.now() - surgery) / 86400000)
      : 0;

    document.getElementById('dayBadge').textContent     = `Day ${daysSince} of Recovery`;
    document.getElementById('planSubtitle').textContent = `${userProfile.surgeryType || 'Post-surgery'} · Day ${daysSince} personalised plan`;
    document.getElementById('planTitle').textContent    = `Day ${daysSince} Recovery Plan`;

    generatePlan();
  } catch (e) {
    console.error('Init error:', e);
  }
}

/* ── Shimmer placeholder HTML ── */
function shimmerGrid() {
  const cards = [
    { icon: '🍽', label: 'Recommended Foods', cls: 'icon-food' },
    { icon: '🏃', label: 'Activities',         cls: 'icon-activity' },
    { icon: '✅', label: "Do's",               cls: 'icon-do' },
    { icon: '❌', label: "Don'ts",             cls: 'icon-dont' },
  ];
  const shimmerLines = `
    <div class="shimmer-line"></div>
    <div class="shimmer-line"></div>
    <div class="shimmer-line"></div>`;

  return cards.map((c, i) => `
    <div class="plan-card" style="animation-delay:${i * 0.08}s">
      <div class="plan-card-header">
        <div class="plan-card-icon ${c.cls}">${c.icon}</div>
        <div class="plan-card-title">${c.label}</div>
      </div>
      ${shimmerLines}
    </div>
  `).join('') + `
    <div class="plan-card plan-card-full">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-activity">🕐</div>
        <div class="plan-card-title">Suggested Daily Schedule</div>
      </div>
      ${shimmerLines}
    </div>`;
}

/* ── Generate plan from API ── */
async function generatePlan() {
  const btn = document.getElementById('regenBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';

  document.getElementById('planGrid').innerHTML = shimmerGrid();

  try {
    const res = await fetch('/api/dailyplan/generate', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  'Bearer ' + token,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate plan');
    renderPlan(data);
  } catch (e) {
    document.getElementById('planGrid').innerHTML = `
      <div class="plan-card plan-card-full" style="text-align:center;color:var(--text3);padding:2rem">
        ${e.message}
      </div>`;
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '🔄 Regenerate Plan';
  }
}

/* ── Render plan cards ── */
function renderPlan(data) {
  const makeItems = (items = [], bulletClass) =>
    items.map(item => `
      <div class="plan-item">
        <div class="plan-bullet ${bulletClass}"></div>
        <span>${item}</span>
      </div>`).join('');

  const makeSchedule = (items = []) =>
    items.map(item => `
      <div class="sched-item">
        <div class="sched-time">${item.time}</div>
        <div class="sched-text">${item.activity}</div>
      </div>`).join('');

  document.getElementById('planGrid').innerHTML = `
    <div class="plan-card" style="animation:fadeUp 0.5s ease both">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-food">🍽</div>
        <div class="plan-card-title">Recommended Foods</div>
      </div>
      <div class="plan-items">${makeItems(data.foods, 'bullet-green')}</div>
    </div>

    <div class="plan-card" style="animation:fadeUp 0.5s 0.08s ease both">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-activity">🏃</div>
        <div class="plan-card-title">Activities</div>
      </div>
      <div class="plan-items">${makeItems(data.activities, 'bullet-blue')}</div>
    </div>

    <div class="plan-card" style="animation:fadeUp 0.5s 0.16s ease both">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-do">✅</div>
        <div class="plan-card-title">Do's</div>
      </div>
      <div class="plan-items">${makeItems(data.dos, 'bullet-green')}</div>
    </div>

    <div class="plan-card" style="animation:fadeUp 0.5s 0.24s ease both">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-dont">❌</div>
        <div class="plan-card-title">Don'ts</div>
      </div>
      <div class="plan-items">${makeItems(data.donts, 'bullet-red')}</div>
    </div>

    <div class="plan-card plan-card-full" style="animation:fadeUp 0.5s 0.32s ease both">
      <div class="plan-card-header">
        <div class="plan-card-icon icon-activity">🕐</div>
        <div class="plan-card-title">Suggested Daily Schedule</div>
      </div>
      <div class="schedule">${makeSchedule(data.schedule)}</div>
    </div>`;
}

/* ── Logout ── */
function doLogout() {
  ['hp_token', 'hp_role', 'hp_name'].forEach(k => localStorage.removeItem(k));
  window.location.href = '/index.html';
}

/* ── Boot ── */
init();