/* =====================================================================
   Employee Record System — Frontend Logic
   Stack: Vanilla JS  ↔  Flask REST API  ↔  MongoDB
   ===================================================================== */

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────
let currentView  = 'dashboard';
let editingId    = null;
let deleteTarget = null;
let searchTimer  = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const sidebar       = document.getElementById('sidebar');
const menuToggle    = document.getElementById('menuToggle');
const topbarTitle   = document.getElementById('topbarTitle');
const topAddBtn     = document.getElementById('topAddBtn');
const empTableBody  = document.getElementById('empTableBody');
const tableMeta     = document.getElementById('tableMeta');
const searchInput   = document.getElementById('searchInput');
const deptFilter    = document.getElementById('deptFilter');
const deptSuggests  = document.getElementById('deptSuggestions');
const empForm       = document.getElementById('empForm');
const empId         = document.getElementById('empId');
const formTitle     = document.getElementById('formTitle');
const formSubtitle  = document.getElementById('formSubtitle');
const submitBtn     = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const btnSpinner    = document.getElementById('btnSpinner');
const cancelBtn     = document.getElementById('cancelBtn');
const formAlert     = document.getElementById('formAlert');
const deleteModal   = document.getElementById('deleteModal');
const modalBody     = document.getElementById('modalBody');
const cancelDelete  = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const toastContainer= document.getElementById('toastContainer');

// Form fields
const ff = {
  name:     document.getElementById('fieldName'),
  email:    document.getElementById('fieldEmail'),
  phone:    document.getElementById('fieldPhone'),
  dept:     document.getElementById('fieldDept'),
  position: document.getElementById('fieldPosition'),
  salary:   document.getElementById('fieldSalary'),
  joining:  document.getElementById('fieldJoining'),
  status:   document.getElementById('fieldStatus'),
  address:  document.getElementById('fieldAddress'),
};

// ── Navigation ────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${name}`).classList.add('active');
  const navEl = document.getElementById(`nav-${name}`);
  if (navEl) navEl.classList.add('active');

  const titles = { dashboard: 'Dashboard', employees: 'Employees', add: editingId ? 'Edit Employee' : 'Add Employee' };
  topbarTitle.textContent = titles[name] || name;
  topAddBtn.style.display = name === 'employees' ? 'flex' : 'none';
  currentView = name;

  // Load data for the view
  if (name === 'dashboard')  loadDashboard();
  if (name === 'employees')  loadEmployees();
  if (name === 'add' && !editingId) resetForm();

  // Close sidebar on mobile
  if (window.innerWidth <= 720) sidebar.classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const view = item.dataset.view;
    if (view === 'add') { editingId = null; resetForm(); }
    showView(view);
  });
});

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

// Close sidebar clicking outside (mobile)
document.addEventListener('click', e => {
  if (window.innerWidth <= 720 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ── Toast ─────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast-dot"></span>${msg}`;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ── Dashboard ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [stats, employees] = await Promise.all([
      fetchJSON(`${API}/stats`),
      fetchJSON(`${API}/employees?search=&department=`),
    ]);

    document.getElementById('statTotal').textContent  = stats.total_employees;
    document.getElementById('statDepts').textContent  = Object.keys(stats.by_department).length;
    document.getElementById('statSalary').textContent = stats.average_salary
      ? `₹${Number(stats.average_salary).toLocaleString('en-IN')}`
      : '—';

    // Department breakdown
    const deptEl = document.getElementById('deptBreakdown');
    deptEl.innerHTML = '';
    const maxCount = Math.max(...Object.values(stats.by_department), 1);
    const depts = Object.entries(stats.by_department).sort((a,b) => b[1]-a[1]);

    if (depts.length === 0) {
      deptEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No data yet.</p>';
    } else {
      depts.forEach(([dept, count]) => {
        const row = document.createElement('div');
        row.className = 'dept-row';
        row.innerHTML = `
          <span class="dept-name" title="${dept}">${dept}</span>
          <div class="dept-bar-wrap"><div class="dept-bar" style="width:${(count/maxCount)*100}%"></div></div>
          <span class="dept-count">${count}</span>`;
        deptEl.appendChild(row);
      });
    }

    // Recent employees
    const recentEl = document.getElementById('recentList');
    recentEl.innerHTML = '';
    const recent = employees.slice(0, 6);
    if (recent.length === 0) {
      recentEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem">No employees yet.</p>';
    } else {
      recent.forEach(emp => {
        const row = document.createElement('div');
        row.className = 'recent-row';
        row.innerHTML = `
          <div class="recent-avatar">${initials(emp.name)}</div>
          <div>
            <div class="recent-name">${emp.name}</div>
            <div class="recent-role">${emp.position} · ${emp.department}</div>
          </div>`;
        row.addEventListener('click', () => {
          editingId = null;
          openEdit(emp);
        });
        recentEl.appendChild(row);
      });
    }
  } catch(e) {
    toast('Failed to load dashboard data.', 'error');
  }
}

// ── Employees table ───────────────────────────────────────────────────────
async function loadEmployees() {
  const search = searchInput.value.trim();
  const dept   = deptFilter.value;

  empTableBody.innerHTML = `<tr><td colspan="6" class="table-loading">Loading…</td></tr>`;

  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dept)   params.set('department', dept);

    const employees = await fetchJSON(`${API}/employees?${params}`);

    if (employees.length === 0) {
      empTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">No employees found.</td></tr>`;
      tableMeta.textContent = '';
      return;
    }

    empTableBody.innerHTML = '';
    employees.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="emp-name-cell">
            <div class="emp-avatar">${initials(emp.name)}</div>
            <div>
              <div class="emp-name-text">${esc(emp.name)}</div>
              <div class="emp-email-text">${esc(emp.email)}</div>
            </div>
          </div>
        </td>
        <td>${esc(emp.email)}</td>
        <td>${esc(emp.department)}</td>
        <td>${esc(emp.position)}</td>
        <td>₹${Number(emp.salary).toLocaleString('en-IN')}</td>
        <td>
          <div class="action-btns">
            <button class="icon-btn icon-btn--edit" title="Edit" data-id="${emp._id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn icon-btn--delete" title="Delete" data-id="${emp._id}" data-name="${esc(emp.name)}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>`;
      empTableBody.appendChild(tr);

      tr.querySelector('.icon-btn--edit').addEventListener('click', () => openEdit(emp));
      tr.querySelector('.icon-btn--delete').addEventListener('click', () => openDelete(emp));
    });

    tableMeta.textContent = `Showing ${employees.length} employee${employees.length !== 1 ? 's' : ''}`;
    await refreshDeptFilter();
  } catch(e) {
    empTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">Error loading data.</td></tr>`;
    toast('Failed to load employees.', 'error');
  }
}

// Live search
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadEmployees, 350);
});
deptFilter.addEventListener('change', loadEmployees);

// ── Department filter refresh ─────────────────────────────────────────────
async function refreshDeptFilter() {
  try {
    const depts = await fetchJSON(`${API}/departments`);
    const cur = deptFilter.value;
    deptFilter.innerHTML = '<option value="">All Departments</option>';
    depts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      if (d === cur) opt.selected = true;
      deptFilter.appendChild(opt);
    });

    // Datalist for form
    deptSuggests.innerHTML = '';
    depts.forEach(d => {
      const opt2 = document.createElement('option');
      opt2.value = d;
      deptSuggests.appendChild(opt2);
    });
  } catch(_) {}
}

// ── Form helpers ──────────────────────────────────────────────────────────
function resetForm() {
  empForm.reset();
  empId.value = '';
  clearErrors();
  formAlert.className = 'form-alert hidden';
  formAlert.textContent = '';
  formTitle.textContent    = 'Add Employee';
  formSubtitle.textContent = 'Fill in the details below to create a new employee record';
  submitBtnText.textContent = 'Save Employee';
}

function clearErrors() {
  ['Name','Email','Dept','Position','Salary'].forEach(f => {
    document.getElementById(`err${f}`).textContent = '';
    ff[f.toLowerCase()]?.classList.remove('error');
  });
  if (ff['dept']) ff['dept'].classList.remove('error');
}

function setError(field, msg) {
  const errEl = document.getElementById(`err${field}`);
  if (errEl) errEl.textContent = msg;
  ff[field.toLowerCase()]?.classList.add('error');
}

function openEdit(emp) {
  editingId = emp._id;
  ff.name.value     = emp.name      || '';
  ff.email.value    = emp.email     || '';
  ff.phone.value    = emp.phone     || '';
  ff.dept.value     = emp.department|| '';
  ff.position.value = emp.position  || '';
  ff.salary.value   = emp.salary    || '';
  ff.joining.value  = emp.joining_date || '';
  ff.status.value   = emp.status    || 'Active';
  ff.address.value  = emp.address   || '';
  empId.value       = emp._id;

  formTitle.textContent    = 'Edit Employee';
  formSubtitle.textContent = `Editing record for ${emp.name}`;
  submitBtnText.textContent = 'Update Employee';
  clearErrors();
  formAlert.className = 'form-alert hidden';
  showView('add');
}

cancelBtn.addEventListener('click', () => {
  editingId = null;
  showView('employees');
});

// ── Form submit ───────────────────────────────────────────────────────────
empForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();
  formAlert.className = 'form-alert hidden';

  // Client-side validation
  let valid = true;
  if (!ff.name.value.trim())     { setError('Name',     'Full name is required.');    valid = false; }
  if (!ff.email.value.trim())    { setError('Email',    'Email is required.');         valid = false; }
  else if (!/\S+@\S+\.\S+/.test(ff.email.value)) { setError('Email', 'Enter a valid email.'); valid = false; }
  if (!ff.dept.value.trim())     { setError('Dept',     'Department is required.');   valid = false; }
  if (!ff.position.value.trim()) { setError('Position', 'Position is required.');     valid = false; }
  if (!ff.salary.value)          { setError('Salary',   'Salary is required.');       valid = false; }
  else if (Number(ff.salary.value) < 0) { setError('Salary', 'Salary cannot be negative.'); valid = false; }
  if (!valid) return;

  const payload = {
    name:         ff.name.value.trim(),
    email:        ff.email.value.trim(),
    phone:        ff.phone.value.trim(),
    department:   ff.dept.value.trim(),
    position:     ff.position.value.trim(),
    salary:       parseFloat(ff.salary.value),
    joining_date: ff.joining.value,
    status:       ff.status.value,
    address:      ff.address.value.trim(),
  };

  // Spinner on
  submitBtn.disabled = true;
  submitBtnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');

  try {
    let res;
    if (editingId) {
      res = await apiFetch(`${API}/employees/${editingId}`, 'PUT', payload);
    } else {
      res = await apiFetch(`${API}/employees`, 'POST', payload);
    }

    if (res.error) {
      showFormAlert(res.error, 'error');
    } else {
      toast(editingId ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
      editingId = null;
      showView('employees');
    }
  } catch(err) {
    showFormAlert('Network error. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
  }
});

function showFormAlert(msg, type) {
  formAlert.textContent = msg;
  formAlert.className   = `form-alert ${type}`;
}

// ── Delete modal ──────────────────────────────────────────────────────────
function openDelete(emp) {
  deleteTarget = emp._id;
  modalBody.textContent = `Are you sure you want to delete ${emp.name}? This action cannot be undone.`;
  deleteModal.classList.remove('hidden');
}

cancelDelete.addEventListener('click', () => {
  deleteModal.classList.add('hidden');
  deleteTarget = null;
});

deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) {
    deleteModal.classList.add('hidden');
    deleteTarget = null;
  }
});

confirmDelete.addEventListener('click', async () => {
  if (!deleteTarget) return;
  confirmDelete.disabled = true;
  confirmDelete.textContent = 'Deleting…';

  try {
    const res = await apiFetch(`${API}/employees/${deleteTarget}`, 'DELETE');
    deleteModal.classList.add('hidden');
    deleteTarget = null;
    if (res.error) {
      toast(res.error, 'error');
    } else {
      toast('Employee deleted successfully.', 'success');
      loadEmployees();
      if (currentView === 'dashboard') loadDashboard();
    }
  } catch(e) {
    toast('Delete failed. Try again.', 'error');
  } finally {
    confirmDelete.disabled = false;
    confirmDelete.textContent = 'Delete';
  }
});

// ── Utilities ─────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const r = await fetch(url);
  return r.json();
}

async function apiFetch(url, method, body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
}

function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
(async () => {
  await refreshDeptFilter();
  showView('dashboard');
})();
