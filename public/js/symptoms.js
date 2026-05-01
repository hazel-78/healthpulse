/* ──────────────────────────────────────────
   HealthPulse · symptoms.js
   Handles: auth guard, pain scale, symptom
            tags, AI analysis, history
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
let painLevel    = 0;
let userProfile  = {};
const selectedSymptoms = new Set();

/* ── Common symptom tags ── */
const SYMPTOMS = [
  'Fever', 'Chills', 'Nausea', 'Vomiting', 'Dizziness',
  'Fatigue', 'Swelling', 'Redness', 'Discharge',
  'Shortness of breath', 'Headache', 'Muscle ache',
  'Loss of appetite', 'Insomnia', 'Anxiety',
];

/* ── Build pain scale (1–10) ── */
(function buildPainScale() {
  const container = document.getElementById('painScale');
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.className   = 'pain-btn';
    btn.textContent = i;
    btn.setAttribute('aria-label', `Pain level ${i}`);
    btn.onclick = () => selectPain(i);
    container.appendChild(btn);
  }
})();

function selectPain(level) {
  painLevel = level;
  document.querySelectorAll('.pain-btn').forEach((btn, idx) => {
    const n = idx + 1;
    btn.className = 'pain-btn' + (
      n <= level
        ? level <= 3 ? ' selected'
        : level <= 6 ? ' warn'
        : ' danger'
        : ''
    );
  });
}

/* ── Build symptom tag grid ── */
(function buildTagGrid() {
  const grid = document.getElementById('tagGrid');
  SYMPTOMS.forEach(symptom => {
    const tag = document.createElement('div');
    tag.className   = 'sym-tag';
    tag.textContent = symptom;
    tag.setAttribute('role', 'checkbox');
    tag.setAttribute('aria-checked', 'false');
    tag.onclick = () => toggleSymptom(symptom, tag);
    grid.appendChild(tag);
  });
})();

function toggleSymptom(symptom, el) {
  if (selectedSymptoms.has(symptom)) {
    selectedSymptoms.delete(symptom);
    el.classList.remove('selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    selectedSymptoms.add(symptom);
    el.classList.add('selected');
    el.setAttribute('aria-checked', 'true');
  }
}

/* ── Fetch user profile ── */
fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(u => { userProfile = u; })
  .catch(e => console.error('Profile fetch failed:', e));

/* ── Analyze symptoms ── */
async function analyzeSymptoms() {
  const description = document.getElementById('description').value.trim();
  const location    = document.getElementById('location').value;
  const duration    = document.getElementById('duration').value;

  if (!painLevel) {
    return alert('Please select a pain level.');
  }
  if (!description && selectedSymptoms.size === 0) {
    return alert('Please describe your symptoms or select at least one from the list.');
  }

  const btn = document.getElementById('analyzeBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing…';

  try {
    const res = await fetch('/api/symptoms/analyze', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  'Bearer ' + token,
      },
      body: JSON.stringify({
        painLevel,
        symptoms:    [...selectedSymptoms],
        location,
        duration,
        description,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Analysis failed');

    showResult(data.severity, data.analysis);
    await saveSymptomLog(data.severity, data.analysis);
    loadHistory();
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '🧠 Analyze with AI';
  }
}

/* ── Save symptom log to backend ── */
async function saveSymptomLog(severity, analysis) {
  try {
    await fetch('/api/symptoms/save', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  'Bearer ' + token,
      },
      body: JSON.stringify({
        painLevel,
        symptoms:    [...selectedSymptoms],
        location:    document.getElementById('location').value,
        duration:    document.getElementById('duration').value,
        description: document.getElementById('description').value.trim(),
        severity,
        analysis,
      }),
    });
  } catch (e) {
    console.error('Save failed:', e);
  }
}

/* ── Render AI result ── */
function showResult(severity, text) {
  const sevMap = {
    low:    ['sev-low',    '🟢 Low Severity'],
    medium: ['sev-medium', '🟡 Medium Severity'],
    high:   ['sev-high',   '🔴 High Severity'],
  };
  const [cls, label] = sevMap[(severity || 'medium').toLowerCase()] || sevMap.medium;

  const badge = document.getElementById('severityBadge');
  badge.className   = 'severity-badge ' + cls;
  badge.textContent = label;

  document.getElementById('aiResultText').textContent = text;

  const result = document.getElementById('aiResult');
  result.style.display = 'block';
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Reset form ── */
function resetForm() {
  painLevel = 0;
  selectedSymptoms.clear();

  document.querySelectorAll('.pain-btn').forEach(b => { b.className = 'pain-btn'; });
  document.querySelectorAll('.sym-tag').forEach(t => {
    t.classList.remove('selected');
    t.setAttribute('aria-checked', 'false');
  });
  document.getElementById('description').value = '';
  document.getElementById('location').value    = '';
  document.getElementById('duration').value    = '';
  document.getElementById('aiResult').style.display = 'none';
}

/* ── Load symptom history ── */
async function loadHistory() {
  const el = document.getElementById('historyList');
  try {
    const res  = await fetch('/api/symptoms/history', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const logs = await res.json();

    if (!logs.length) {
      el.innerHTML = '<div class="no-data">No symptoms reported yet.</div>';
      return;
    }

    el.innerHTML = logs.map(log => {
      const d      = new Date(log.createdAt);
      const sevCls = (log.severity || 'low').toLowerCase();
      const date   = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const syms   = log.symptoms?.join(', ') || 'Custom description';
      return `
        <div class="history-item">
          <div class="hi-dot ${sevCls}"></div>
          <div class="hi-body">
            <div class="hi-symptoms">${syms} · Pain ${log.painLevel}/10</div>
            <div class="hi-meta">${date} · Severity: ${log.severity || '—'}</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="no-data">Could not load history.</div>';
  }
}

/* ── Logout ── */
function doLogout() {
  ['hp_token', 'hp_role', 'hp_name'].forEach(k => localStorage.removeItem(k));
  window.location.href = '/index.html';
}

/* ── Boot ── */
loadHistory();