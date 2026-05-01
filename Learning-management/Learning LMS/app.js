/* ── STATE ── */
let allCourses = [];
let deleteTargetId = null;
let moduleCount = 0;

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  loadCourses();
  loadStats();
  setupNavigation();
  setupSearch();
});

/* ── NAVIGATION ── */
function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      showView(view);
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  if (name === "add") {
    resetForm();
    addModuleRow();
  }
}

/* ── SEARCH ── */
function setupSearch() {
  const input = document.getElementById("searchInput");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => fetchCourses(input.value.trim()), 300);
  });
}

/* ── API CALLS ── */
async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    const data = await res.json();
    document.getElementById("statCourses").textContent = data.total_courses;
    document.getElementById("statInstructors").textContent = data.total_instructors;
    document.getElementById("statModules").textContent = data.total_modules;
  } catch (e) { 
    console.error("Stats error", e); 
    document.getElementById("statCourses").textContent = "—";
    document.getElementById("statInstructors").textContent = "—";
    document.getElementById("statModules").textContent = "—";
  }
}

async function loadCourses() {
  await fetchCourses("");
}

async function fetchCourses(search = "") {
  const grid = document.getElementById("courseGrid");
  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading courses…</p></div>`;
  try {
    const url = search ? `/api/courses?search=${encodeURIComponent(search)}` : "/api/courses";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    allCourses = await res.json();
    renderCourses(allCourses);
    document.getElementById("courseCount").textContent =
      allCourses.length === 1 ? "1 course" : `${allCourses.length} courses`;
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load courses</h3><p>Check your server connection.</p></div>`;
  }
}

/* ── RENDER ── */
function renderCourses(courses) {
  const grid = document.getElementById("courseGrid");
  if (!courses.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><h3>No courses yet</h3><p>Create your first course to get started.</p></div>`;
    return;
  }
  grid.innerHTML = courses.map(c => courseCard(c)).join("");
}

/* ── COURSE CARD ── */
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function courseCard(c) {
  const initials = c.instructor.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const moduleCount = Array.isArray(c.modules) ? c.modules.length : 0;
  return `
  <div class="card" onclick="viewCourse('${c._id}')">
    <div class="card-tag">📘 Course</div>
    <h3 class="card-title">${esc(c.title)}</h3>
    <div class="card-instructor">
      <div class="avatar">${initials}</div>
      <span>${esc(c.instructor)}</span>
    </div>
    <p class="card-desc">${esc(c.description)}</p>
    <div class="card-meta">
      <span class="meta-pill">⏱ ${esc(c.duration)}</span>
      <span class="meta-pill">🗂 ${moduleCount} module${moduleCount !== 1 ? "s" : ""}</span>
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="btn-view" onclick="viewCourse('${c._id}')">View</button>
      <button class="btn-edit" onclick="editCourse('${c._id}')">Edit</button>
      <button class="btn-del" onclick="promptDelete('${c._id}')">Delete</button>
    </div>
  </div>`;
}

/* ── VIEW MODAL ── */
function viewCourse(id) {
  const c = allCourses.find(x => x._id === id);
  if (!c) return;
  const initials = c.instructor.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const mods = Array.isArray(c.modules) ? c.modules : [];
  const modHTML = mods.length
    ? mods.map((m, i) => `<div class="modal-module"><div class="mm-num">${i + 1}</div><div><div class="mm-title">${esc(m.title)}</div>${m.content ? `<div class="mm-content">${esc(m.content)}</div>` : ""}</div></div>`).join("")
    : `<p style="color:var(--text-muted);font-size:14px;">No modules added.</p>`;

  document.getElementById("modalContent").innerHTML = `
    <div class="modal-course-tag">📘 Course Details</div>
    <h2 class="modal-title">${esc(c.title)}</h2>
    <div class="modal-instructor"><div class="avatar">${initials}</div><span>${esc(c.instructor)}</span></div>
    <div class="modal-meta">
      <span class="meta-pill">⏱ ${esc(c.duration)}</span>
      <span class="meta-pill">🗂 ${mods.length} module${mods.length !== 1 ? "s" : ""}</span>
    </div>
    <div class="modal-section-title">Description</div>
    <p class="modal-desc">${esc(c.description)}</p>
    <div class="modal-section-title">Modules</div>
    ${modHTML}`;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal(e) {
  if (!e || e.target.id === "modal" || e.target.classList.contains("modal-close")) {
    document.getElementById("modal").classList.add("hidden");
  }
}

/* ── EDIT COURSE ── */
function editCourse(id) {
  const c = allCourses.find(x => x._id === id);
  if (!c) return;
  showView("add");
  document.querySelector('[data-view="add"]').classList.add("active");
  document.querySelector('[data-view="courses"]').classList.remove("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "add"));

  document.getElementById("formTitle").textContent = "Edit Course";
  document.getElementById("formSub").textContent = "Update the course details below.";
  document.getElementById("submitLabel").textContent = "Save Changes";
  document.getElementById("editId").value = c._id;

  document.getElementById("fTitle").value = c.title;
  document.getElementById("fInstructor").value = c.instructor;
  document.getElementById("fDescription").value = c.description;
  document.getElementById("fDuration").value = c.duration;

  const list = document.getElementById("modulesList");
  list.innerHTML = "";
  moduleCount = 0;
  (c.modules || []).forEach(m => addModuleRow(m.title, m.content));
  if (!c.modules || !c.modules.length) addModuleRow();
}

/* ── FORM SUBMIT ── */
async function submitForm() {
  const id = document.getElementById("editId").value;
  const title = document.getElementById("fTitle").value.trim();
  const instructor = document.getElementById("fInstructor").value.trim();
  const description = document.getElementById("fDescription").value.trim();
  const duration = document.getElementById("fDuration").value.trim();

  const modules = [];
  document.querySelectorAll(".module-row").forEach(row => {
    const t = row.querySelector(".module-title-input").value.trim();
    const c = row.querySelector(".module-content-input").value.trim();
    if (t) modules.push({ title: t, content: c });
  });

  clearFormError();
  if (!title || !instructor || !description || !duration) {
    showFormError("Please fill in all required fields.");
    return;
  }

  const payload = { title, instructor, description, duration, modules };
  const url = id ? `/api/courses/${id}` : "/api/courses";
  const method = id ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) { showFormError(data.error || "Something went wrong."); return; }

    showToast(id ? "✅ Course updated!" : "✅ Course created!", "success");
    loadCourses();
    loadStats();
    showView("courses");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "courses"));
  } catch (e) {
    showFormError("Network error. Is the server running?");
  }
}

function cancelForm() {
  showView("courses");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "courses"));
}

function resetForm() {
  document.getElementById("courseForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").textContent = "Add New Course";
  document.getElementById("formSub").textContent = "Fill in the details below to create a course.";
  document.getElementById("submitLabel").textContent = "Create Course";
  document.getElementById("modulesList").innerHTML = "";
  moduleCount = 0;
  addModuleRow();
}

/* ── MODULES ── */
function addModuleRow(title = "", content = "") {
  moduleCount++;
  const list = document.getElementById("modulesList");
  const row = document.createElement("div");
  row.className = "module-row";
  row.innerHTML = `
    <div class="module-row-header">
      <div class="module-num">${list.children.length + 1}</div>
      <input type="text" class="module-title-input" placeholder="Module title…" value="${esc(title)}"/>
      <button type="button" class="btn-remove-module" onclick="removeModuleRow(this)" title="Remove">✕</button>
    </div>
    <textarea class="module-content-input" placeholder="Brief description of this module (optional)…" rows="2">${esc(content)}</textarea>`;
  list.appendChild(row);
  renumberModules();
}

function removeModuleRow(btn) { btn.closest(".module-row").remove(); renumberModules(); }
function renumberModules() { document.querySelectorAll(".module-row").forEach((row, i) => { row.querySelector(".module-num").textContent = i + 1; }); }

/* ── DELETE ── */
function promptDelete(id) { deleteTargetId = id; document.getElementById("confirmOverlay").classList.remove("hidden"); }
function closeDeleteModal() { deleteTargetId = null; document.getElementById("confirmOverlay").classList.add("hidden"); }
async function confirmDelete() {
  if (!deleteTargetId) return;
  try {
    const res = await fetch(`/api/courses/${deleteTargetId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("🗑 Course deleted.", "success");
      loadCourses();
      loadStats();
    } else {
      showToast("Failed to delete course.", "error");
    }
  } catch (e) {
    showToast("Network error.", "error");
  }
  closeDeleteModal();
}

/* ── FORM HELPERS ── */
function showFormError(msg) { document.getElementById("formError").textContent = msg; document.getElementById("formError").classList.remove("hidden"); }
function clearFormError() { document.getElementById("formError").classList.add("hidden"); }

/* ── TOAST ── */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add("hidden"), 3000);
}
    }
  } catch (e) {
    showToast("Network error.", "error");
  }
  cancelDelete();
}

/* ── HELPERS ── */
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add("hidden"), 3000);
}
function showFormError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function clearFormError() {
  document.getElementById("formError").classList.add("hidden");
}
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Close confirm overlay on backdrop click
document.getElementById("confirmOverlay").addEventListener("click", function(e) {
  if (e.target === this) cancelDelete();
});
