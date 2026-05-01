/* ──────────────────────────────────────────
   HealthPulse · upload-report.js
   Handles: auth guard, drag-and-drop,
            file validation, AI analysis,
            report history
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
let selectedFile = null;
let userProfile  = {};

/* ── Allowed MIME types & size limit ── */
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB   = 10;

/* ── Fetch user profile ── */
fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
  .then(r => r.json())
  .then(u => { userProfile = u; })
  .catch(e => console.error('Profile fetch failed:', e));

/* ── Drag-and-drop wiring ── */
(function initDropZone() {
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
})();

/* ── File input change handler ── */
function handleFile(file) {
  if (!file) return;

  if (!ALLOWED_TYPES.includes(file.type)) {
    return alert('Unsupported file type. Please upload a PDF, JPG, PNG, or WEBP.');
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return alert(`File must be under ${MAX_SIZE_MB}MB.`);
  }

  selectedFile = file;

  document.getElementById('fileName').textContent    = file.name;
  document.getElementById('fileSize').textContent    = (file.size / 1024).toFixed(1) + ' KB';
  document.getElementById('fileIconEl').textContent  = file.type === 'application/pdf' ? '📕' : '🖼';

  document.getElementById('filePreview').style.display = 'flex';
  document.getElementById('analyzeBtn').style.display  = 'flex';
  document.getElementById('dropZone').style.display    = 'none';
  document.getElementById('aiResult').style.display    = 'none';
}

/* ── Remove selected file ── */
function removeFile() {
  selectedFile = null;
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('analyzeBtn').style.display  = 'none';
  document.getElementById('dropZone').style.display    = 'block';
  document.getElementById('fileInput').value           = '';
}

/* ── Reset to upload state (after viewing result) ── */
function uploadAnother() {
  removeFile();
  document.getElementById('aiResult').style.display = 'none';
}

/* ── Analyze report via backend ── */
async function analyzeReport() {
  if (!selectedFile) return;

  const btn = document.getElementById('analyzeBtn');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing…';

  try {
    const formData = new FormData();
    formData.append('report',       selectedFile);
    formData.append('surgeryType',  userProfile.surgeryType || 'general surgery');

    const res = await fetch('/api/report/analyze', {
      method:  'POST',
      headers: { Authorization: 'Bearer ' + token },
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Analysis failed');

    showResult(selectedFile.name, data.analysis);
    loadHistory();
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '🧠 Extract &amp; Explain with AI';
  }
}

/* ── Render AI result ── */
function showResult(fileName, analysisText) {
  document.getElementById('resultFileName').textContent = fileName;
  document.getElementById('resultText').textContent     = analysisText;

  const result = document.getElementById('aiResult');
  result.style.display = 'block';
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Load report history ── */
async function loadHistory() {
  const el = document.getElementById('reportList');
  try {
    const res  = await fetch('/api/report/history', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();

    if (!data.length) {
      el.innerHTML = '<div class="no-data">No reports uploaded yet.</div>';
      return;
    }

    el.innerHTML = data.map(r => {
      const d    = new Date(r.createdAt);
      const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const icon = r.fileType === 'pdf' ? '📕' : '🖼';
      return `
        <div class="report-item">
          <div class="ri-icon">${icon}</div>
          <div>
            <div class="ri-name">${r.fileName || 'Report'}</div>
            <div class="ri-date">${date}</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="no-data">Could not load report history.</div>';
  }
}

/* ── Logout ── */
function doLogout() {
  ['hp_token', 'hp_role', 'hp_name'].forEach(k => localStorage.removeItem(k));
  window.location.href = '/index.html';
}

/* ── Boot ── */
loadHistory();