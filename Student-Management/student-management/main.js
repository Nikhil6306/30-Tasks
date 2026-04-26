/* ── STATE ──────────────────────────────────────────────────────── */
let allStudents = [];
let deleteTargetId = null;

/* ── NAV ────────────────────────────────────────────────────────── */
const viewTitles = { dashboard: "Dashboard", students: "All Students", add: "Add Student" };

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    setView(view);
  });
});

function setView(view) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `view-${view}`));
  document.getElementById("viewTitle").textContent = viewTitles[view] || view;
  document.getElementById("searchWrap").style.display = view === "students" ? "flex" : "none";

  if (view === "dashboard") loadDashboard();
  if (view === "students") loadStudents();
}

/* ── TOAST ──────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

/* ── API HELPERS ────────────────────────────────────────────────── */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ── DASHBOARD ──────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const [stats, students] = await Promise.all([
      apiFetch("/api/stats"),
      apiFetch("/api/students"),
    ]);

    document.getElementById("statTotal").textContent    = stats.total;
    document.getElementById("statBranches").textContent = stats.branches;

    // Branch bar chart
    const chart = document.getElementById("branchChart");
    chart.innerHTML = "";
    const maxCount = Math.max(...Object.values(stats.by_branch || {}), 1);
    Object.entries(stats.by_branch || {}).sort((a, b) => b[1] - a[1]).forEach(([branch, count]) => {
      const pct = (count / maxCount) * 100;
      chart.innerHTML += `
        <div class="branch-row">
          <div class="branch-label">${branch}</div>
          <div class="branch-bar-wrap">
            <div class="branch-bar" style="width:${pct}%"></div>
          </div>
          <div class="branch-count">${count}</div>
        </div>`;
    });
    if (!Object.keys(stats.by_branch || {}).length) {
      chart.innerHTML = `<div style="color:var(--text-muted);font-size:.85rem">No data yet</div>`;
    }

    // Recent students (last 5)
    const recent = document.getElementById("recentStudents");
    recent.innerHTML = "";
    students.slice(-5).reverse().forEach(s => {
      recent.innerHTML += `
        <div class="recent-item">
          <div>
            <div class="recent-name">${esc(s.name)}</div>
            <div class="recent-meta">${esc(s.roll_no)} · ${esc(s.branch)} · Year ${esc(s.year)}</div>
          </div>
          ${s.cgpa ? `<div class="${cgpaClass(s.cgpa)}" style="font-family:var(--font-mono);font-size:.85rem">${s.cgpa}</div>` : ""}
        </div>`;
    });
    if (!students.length) recent.innerHTML = `<div style="color:var(--text-muted)">No students yet</div>`;
  } catch (e) {
    showToast("Failed to load dashboard: " + e.message, "error");
  }
}

/* ── ALL STUDENTS ───────────────────────────────────────────────── */
async function loadStudents(query = {}) {
  try {
    const params = new URLSearchParams(query).toString();
    allStudents = await apiFetch(`/api/students${params ? "?" + params : ""}`);
    renderTable(allStudents);
  } catch (e) {
    showToast("Failed to load students: " + e.message, "error");
  }
}

function renderTable(students) {
  const tbody = document.getElementById("studentsTbody");
  const empty = document.getElementById("emptyState");
  tbody.innerHTML = "";

  if (!students.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  students.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color:var(--text-muted);font-family:var(--font-mono)">${i + 1}</td>
      <td><strong>${esc(s.name)}</strong></td>
      <td><span class="roll-badge">${esc(s.roll_no)}</span></td>
      <td><span class="branch-pill">${esc(s.branch)}</span></td>
      <td>${esc(s.year)}</td>
      <td style="color:var(--text-muted)">${esc(s.email)}</td>
      <td><span class="cgpa-val ${cgpaClass(s.cgpa)}">${s.cgpa || "–"}</span></td>
      <td>
        <div class="actions">
          <button class="btn-edit" onclick="openEdit('${s._id}')">Edit</button>
          <button class="btn-del"  onclick="openDelete('${s._id}', '${esc(s.name)}')">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

/* search / filter */
let searchTimer;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 300);
});
document.getElementById("filterBranch").addEventListener("change", applyFilters);
document.getElementById("filterYear").addEventListener("change", applyFilters);

function applyFilters() {
  const search = document.getElementById("searchInput").value.trim();
  const branch = document.getElementById("filterBranch").value;
  const year   = document.getElementById("filterYear").value;
  const q = {};
  if (search) q.search = search;
  if (branch) q.branch = branch;
  if (year)   q.year   = year;
  loadStudents(q);
}

/* ── CREATE ─────────────────────────────────────────────────────── */
async function submitStudent() {
  const payload = {
    name:    document.getElementById("f-name").value.trim(),
    roll_no: document.getElementById("f-roll").value.trim(),
    email:   document.getElementById("f-email").value.trim(),
    phone:   document.getElementById("f-phone").value.trim(),
    branch:  document.getElementById("f-branch").value,
    year:    document.getElementById("f-year").value,
    cgpa:    document.getElementById("f-cgpa").value.trim(),
  };

  if (!payload.name || !payload.roll_no || !payload.email || !payload.branch || !payload.year) {
    showToast("Please fill all required fields", "error"); return;
  }

  try {
    await apiFetch("/api/students", { method: "POST", body: JSON.stringify(payload) });
    showToast(`${payload.name} added successfully!`);
    clearForm();
    setView("students");
  } catch (e) {
    showToast(e.message, "error");
  }
}

function clearForm() {
  ["f-name","f-roll","f-email","f-phone","f-cgpa"].forEach(id => document.getElementById(id).value = "");
  ["f-branch","f-year"].forEach(id => document.getElementById(id).value = "");
}

/* ── EDIT MODAL ─────────────────────────────────────────────────── */
async function openEdit(id) {
  try {
    const s = await apiFetch(`/api/students/${id}`);
    document.getElementById("m-id").value    = s._id;
    document.getElementById("m-name").value  = s.name;
    document.getElementById("m-roll").value  = s.roll_no;
    document.getElementById("m-email").value = s.email;
    document.getElementById("m-phone").value = s.phone;
    document.getElementById("m-branch").value= s.branch;
    document.getElementById("m-year").value  = s.year;
    document.getElementById("m-cgpa").value  = s.cgpa;
    document.getElementById("modal").style.display = "flex";
  } catch (e) {
    showToast("Could not load student: " + e.message, "error");
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

async function updateStudent() {
  const id = document.getElementById("m-id").value;
  const payload = {
    name:    document.getElementById("m-name").value.trim(),
    roll_no: document.getElementById("m-roll").value.trim(),
    email:   document.getElementById("m-email").value.trim(),
    phone:   document.getElementById("m-phone").value.trim(),
    branch:  document.getElementById("m-branch").value,
    year:    document.getElementById("m-year").value,
    cgpa:    document.getElementById("m-cgpa").value.trim(),
  };

  try {
    const res = await apiFetch(`/api/students/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    showToast(`${res.student.name} updated!`);
    closeModal();
    loadStudents();
  } catch (e) {
    showToast(e.message, "error");
  }
}

/* ── DELETE ─────────────────────────────────────────────────────── */
function openDelete(id, name) {
  deleteTargetId = id;
  document.getElementById("deleteName").textContent = name;
  document.getElementById("deleteModal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
  deleteTargetId = null;
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    await apiFetch(`/api/students/${deleteTargetId}`, { method: "DELETE" });
    showToast("Student deleted");
    closeDeleteModal();
    loadStudents();
  } catch (e) {
    showToast(e.message, "error");
  }
}

/* ── HELPERS ────────────────────────────────────────────────────── */
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function cgpaClass(cgpa) {
  const v = parseFloat(cgpa);
  if (isNaN(v) || !cgpa) return "";
  if (v >= 8)   return "cgpa-high";
  if (v >= 6)   return "cgpa-mid";
  return "cgpa-low";
}

/* Close modals on overlay click */
document.getElementById("modal").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById("deleteModal").addEventListener("click", e => { if (e.target === e.currentTarget) closeDeleteModal(); });

/* ── INIT ───────────────────────────────────────────────────────── */
loadDashboard();
