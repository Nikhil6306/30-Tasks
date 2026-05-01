/* ══════════════════════════════════════════
   HostelOS — Frontend Logic
══════════════════════════════════════════ */

const API = "/api";
let deleteTargetId = null;
let debounceTimer = null;

// ── DOM Refs ──────────────────────────────
const tableBody     = document.getElementById("tableBody");
const recordCount   = document.getElementById("recordCount");
const searchInput   = document.getElementById("searchInput");
const filterBlock   = document.getElementById("filterBlock");
const filterFloor   = document.getElementById("filterFloor");
const blockStats    = document.getElementById("blockStats");
const statTotal     = document.getElementById("statTotal");
const statBlocks    = document.getElementById("statBlocks");
const modalOverlay  = document.getElementById("modalOverlay");
const confirmOverlay= document.getElementById("confirmOverlay");
const allocForm     = document.getElementById("allocForm");
const modalTitle    = document.getElementById("modalTitle");
const submitText    = document.getElementById("submitText");
const formError     = document.getElementById("formError");
const editIdInput   = document.getElementById("editId");

// ── Init ──────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadAllocations();
  loadStats();
  setDefaultDate();
  bindEvents();
});

function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("checkInDate").value = today;
}

// ── Events ───────────────────────────────
function bindEvents() {
  document.getElementById("openAddModal").addEventListener("click", openAddModal);
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelModal").addEventListener("click", closeModal);
  allocForm.addEventListener("submit", handleSubmit);

  document.getElementById("confirmCancel").addEventListener("click", () => {
    confirmOverlay.classList.remove("active");
    deleteTargetId = null;
  });

  document.getElementById("confirmDelete").addEventListener("click", async () => {
    if (!deleteTargetId) return;
    await deleteAllocation(deleteTargetId);
    confirmOverlay.classList.remove("active");
    deleteTargetId = null;
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadAllocations, 350);
  });

  filterBlock.addEventListener("change", loadAllocations);
  filterFloor.addEventListener("change", loadAllocations);
}

// ── Modal ─────────────────────────────────
function openAddModal() {
  allocForm.reset();
  editIdInput.value = "";
  modalTitle.textContent = "New Allocation";
  submitText.textContent = "Add Allocation";
  hideError();
  setDefaultDate();
  modalOverlay.classList.add("active");
  setTimeout(() => document.getElementById("studentName").focus(), 100);
}

function openEditModal(record) {
  allocForm.reset();
  editIdInput.value = record._id;
  modalTitle.textContent = "Edit Allocation";
  submitText.textContent = "Save Changes";

  document.getElementById("studentName").value = record.student_name;
  document.getElementById("roomNumber").value  = record.room_number;
  document.getElementById("block").value       = record.block;
  document.getElementById("floor").value       = record.floor;
  document.getElementById("checkInDate").value = record.check_in_date;

  hideError();
  modalOverlay.classList.add("active");
}

function closeModal() {
  modalOverlay.classList.remove("active");
  hideError();
}

function showError(msg) {
  formError.textContent = msg;
  formError.classList.add("visible");
}

function hideError() {
  formError.classList.remove("visible");
}

// ── CRUD ──────────────────────────────────

// CREATE / UPDATE
async function handleSubmit(e) {
  e.preventDefault();
  hideError();

  const id = editIdInput.value;
  const payload = {
    student_name:  document.getElementById("studentName").value.trim(),
    room_number:   document.getElementById("roomNumber").value.trim(),
    block:         document.getElementById("block").value.trim().toUpperCase(),
    floor:         parseInt(document.getElementById("floor").value),
    check_in_date: document.getElementById("checkInDate").value,
  };

  const method  = id ? "PUT" : "POST";
  const url     = id ? `${API}/allocations/${id}` : `${API}/allocations`;

  try {
    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "An error occurred");
      return;
    }

    closeModal();
    showToast(id ? "✓ Allocation updated" : "✓ Allocation added", "success");
    loadAllocations();
    loadStats();
  } catch (err) {
    showError("Network error. Check if the server is running.");
  }
}

// READ
async function loadAllocations() {
  const search = searchInput.value.trim();
  const block  = filterBlock.value;
  const floor  = filterFloor.value;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (block)  params.set("block", block);
  if (floor)  params.set("floor", floor);

  showLoadingRows();

  try {
    const res  = await fetch(`${API}/allocations?${params}`);
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--danger);font-family:var(--font-mono);font-size:.8rem;">⚠ Could not connect to server</td></tr>`;
  }
}

// DELETE
async function deleteAllocation(id) {
  try {
    const res  = await fetch(`${API}/allocations/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Delete failed", "error");
      return;
    }

    showToast("✓ Allocation removed", "success");
    loadAllocations();
    loadStats();
  } catch (err) {
    showToast("Network error", "error");
  }
}

function confirmDeletePrompt(id, studentName) {
  deleteTargetId = id;
  document.getElementById("confirmText").textContent =
    `Remove allocation for "${studentName}"? This cannot be undone.`;
  confirmOverlay.classList.add("active");
}

// STATS
async function loadStats() {
  try {
    const res  = await fetch(`${API}/stats`);
    const data = await res.json();

    statTotal.textContent  = data.total_allocations;
    statBlocks.textContent = data.blocks_occupied;

    // Block breakdown cards
    blockStats.innerHTML = data.block_breakdown.map(b => `
      <div class="block-card">
        <div>
          <div class="block-label">Block</div>
          <div class="block-name">${b.block}</div>
        </div>
        <div class="block-divider"></div>
        <div>
          <div class="block-num">${b.count}</div>
          <div class="block-label">rooms</div>
        </div>
      </div>
    `).join("");

    // Update block filter dropdown
    const currentVal = filterBlock.value;
    filterBlock.innerHTML = `<option value="">All Blocks</option>` +
      data.block_breakdown.map(b =>
        `<option value="${b.block}" ${currentVal === b.block ? "selected" : ""}>${b.block}</option>`
      ).join("");
  } catch (err) {
    // Server not connected
  }
}

// ── Rendering ─────────────────────────────
function renderTable(records) {
  recordCount.textContent = `${records.length} record${records.length !== 1 ? "s" : ""}`;

  if (!records.length) {
    tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <span class="empty-icon">🏠</span>
            <p>No allocations found</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = records.map((r, i) => `
    <tr>
      <td class="td-index">${String(i + 1).padStart(2, "0")}</td>
      <td class="td-name">${escHtml(r.student_name)}</td>
      <td class="td-room">${escHtml(r.room_number)}</td>
      <td class="td-block"><span class="block-badge">${escHtml(r.block)}</span></td>
      <td><span class="floor-chip">Floor ${r.floor}</span></td>
      <td class="td-date">${formatDate(r.check_in_date)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" title="Edit" onclick='handleEdit(${JSON.stringify(r)})'>
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-del" title="Delete" onclick='confirmDeletePrompt("${r._id}", "${escHtml(r.student_name)}")'>
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function showLoadingRows() {
  tableBody.innerHTML = Array(5).fill(0).map((_, i) => `
    <tr class="loading-row">
      <td><div class="shimmer" style="width:24px"></div></td>
      <td><div class="shimmer" style="width:${120 + (i % 3)*30}px"></div></td>
      <td><div class="shimmer" style="width:50px"></div></td>
      <td><div class="shimmer" style="width:30px"></div></td>
      <td><div class="shimmer" style="width:60px"></div></td>
      <td><div class="shimmer" style="width:90px"></div></td>
      <td><div class="shimmer" style="width:60px"></div></td>
    </tr>
  `).join("");
}

// ── Helpers ───────────────────────────────
function handleEdit(record) {
  openEditModal(record);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

// ── Toast ─────────────────────────────────
let toastTimer = null;

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
