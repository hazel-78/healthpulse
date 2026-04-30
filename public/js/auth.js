/* ──────────────────────────────────────────
   HealthPulse · auth.js
   Handles: time greeting, role selection,
            tab switching, login, register
   ────────────────────────────────────────── */

/* ── Time greeting ── */
(function () {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('timeGreet');
  if (el) el.textContent = greet;
})();

/* ── Role config ── */
const ROLES = {
  patient: {
    icon: '🏥',
    label: 'Patient',
    sub: 'Sign in to your recovery dashboard',
    dot: 'rcd-patient',
  },
  doctor: {
    icon: '👨‍⚕️',
    label: 'Doctor',
    sub: "Access your patients' recovery data",
    dot: 'rcd-doctor',
  },
  family: {
    icon: '👨‍👩‍👧',
    label: 'Family Member',
    sub: 'Stay updated on your loved one',
    dot: 'rcd-family',
  },
};

let currentRole = '';

/* ── Role selection ── */
function selectRole(r) {
  currentRole = r;
  const R = ROLES[r];

  const chipDot  = document.getElementById('chipDot');
  chipDot.textContent = R.icon;
  chipDot.className   = 'role-chip-dot ' + R.dot;

  document.getElementById('chipName').textContent = R.label;
  document.getElementById('chipSub').textContent  = R.sub;

  const isPatient = r === 'patient';
  document.getElementById('patientFields').style.display = isPatient ? '' : 'none';
  document.getElementById('codeField').classList.toggle('hidden', isPatient);

  document.getElementById('screenRole').classList.remove('active');
  document.getElementById('screenAuth').classList.add('active');

  clearAlert();
  switchTab('login');
}

/* ── Back button ── */
function goBack() {
  document.getElementById('screenAuth').classList.remove('active');
  document.getElementById('screenRole').classList.add('active');
  clearAlert();
}

/* ── Tab switching ── */
function switchTab(t) {
  const isLogin = t === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('formLogin').classList.toggle('active', isLogin);
  document.getElementById('formRegister').classList.toggle('active', !isLogin);
  clearAlert();
}

/* ── Alert helpers ── */
function showAlert(msg, type = 'danger') {
  const icon = type === 'danger' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  document.getElementById('alertBox').innerHTML =
    `<div class="alert alert-${type}"><span>${icon}</span><span>${msg}</span></div>`;
}
function clearAlert() {
  document.getElementById('alertBox').innerHTML = '';
}

/* ── Button loading state ── */
function setLoading(btnId, loading, defaultText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Please wait…'
    : defaultText;
}

/* ── Login ── */
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;

  if (!email || !pass) {
    return showAlert('Please enter your email and password.');
  }

  setLoading('loginBtn', true, 'Sign In');
  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed. Please try again.');

    localStorage.setItem('hp_token', data.token);
    localStorage.setItem('hp_role',  data.role);
    localStorage.setItem('hp_name',  data.name);

    showAlert(`Welcome back, ${data.name}! Redirecting…`, 'success');
    setTimeout(() => { window.location.href = `/dashboard-${data.role}.html`; }, 900);
  } catch (e) {
    showAlert(e.message);
    setLoading('loginBtn', false, 'Sign In');
  }
}

/* ── Register ── */
async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const phone = document.getElementById('regPhone').value.trim();

  if (!name || !email || !pass) {
    return showAlert('Please fill in all required fields.');
  }
  if (pass.length < 6) {
    return showAlert('Password must be at least 6 characters.');
  }

  const body = { name, email, password: pass, phone, role: currentRole };

  if (currentRole === 'patient') {
    const surgeryType = document.getElementById('regSurgery').value.trim();
    if (!surgeryType) return showAlert('Please enter your surgery type.');
    body.age         = document.getElementById('regAge').value;
    body.gender      = document.getElementById('regGender').value;
    body.surgeryType = surgeryType;
    body.surgeryDate = document.getElementById('regSurgeryDate').value;
  } else {
    const patientCode = document.getElementById('regCode').value.trim().toUpperCase();
    if (!patientCode) return showAlert('Please enter the patient code.');
    body.patientCode = patientCode;
  }

  setLoading('regBtn', true, 'Create Account');
  try {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed. Please try again.');

    localStorage.setItem('hp_token', data.token);
    localStorage.setItem('hp_role',  data.role);
    localStorage.setItem('hp_name',  data.name);

    showAlert('Account created! Redirecting…', 'success');
    setTimeout(() => { window.location.href = `/dashboard-${data.role}.html`; }, 900);
  } catch (e) {
    showAlert(e.message);
    setLoading('regBtn', false, 'Create Account');
  }
}

/* ── Enter key support ── */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (!document.getElementById('screenAuth').classList.contains('active')) return;
  if (document.getElementById('formLogin').classList.contains('active')) {
    doLogin();
  } else {
    doRegister();
  }
});

/* ── Auto-redirect if already logged in ── */
(function () {
  const token = localStorage.getItem('hp_token');
  const role  = localStorage.getItem('hp_role');
  if (token && role) {
    window.location.href = `/dashboard-${role}.html`;
  }
})();