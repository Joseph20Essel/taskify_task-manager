// ── CONFIG ─────────────────────────────────────────────────────
const API = 'api.php';

// ── STATE ──────────────────────────────────────────────────────
let allTasks      = [];
let currentFilter = '';
let deleteTargetId = null;
let useApi        = true;

// ── DOM REFS ───────────────────────────────────────────────────
const taskGrid      = document.getElementById('task-grid');
const emptyState    = document.getElementById('empty-state');
const taskCount     = document.getElementById('task-count');
const modalOverlay  = document.getElementById('modal-overlay');
const confirmOverlay= document.getElementById('confirm-overlay');
const taskForm      = document.getElementById('task-form');
const modalTitle    = document.getElementById('modal-title');
const toast         = document.getElementById('toast');

const taskIdInput   = document.getElementById('task-id');
const titleInput    = document.getElementById('title');
const descInput     = document.getElementById('description');
const priorityInput = document.getElementById('priority');
const statusInput   = document.getElementById('status');
const dueDateInput  = document.getElementById('due_date');

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', fetchTasks);

function getLocalTasks() {
  const stored = localStorage.getItem('taskify_tasks');
  return stored ? JSON.parse(stored) : [];
}

function saveLocalTasks(tasks) {
  localStorage.setItem('taskify_tasks', JSON.stringify(tasks));
}

function getNextLocalId() {
  const tasks = getLocalTasks();
  const maxId = tasks.reduce((max, task) => Math.max(max, Number(task.id) || 0), 0);
  return max + 1;
}

async function callApi(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (error) {
    return { ok: false, error };
  }
}

async function fetchTasks() {
  const url = currentFilter ? `${API}?status=${encodeURIComponent(currentFilter)}` : API;

  const result = await callApi(url);
  if (result.ok && result.data.success) {
    allTasks = result.data.data;
    useApi = true;
    renderTasks(allTasks);
    updateStats();
    return;
  }

  useApi = false;
  showToast('Backend unavailable; using local storage.', 'error');

  const tasks = getLocalTasks();
  allTasks = currentFilter ? tasks.filter(t => t.status === currentFilter) : tasks;
  renderTasks(allTasks);
  updateStats();
}

// ── RENDER TASKS ───────────────────────────────────────────────
function renderTasks(tasks) {
  // Clear existing cards (keep empty-state div)
  [...taskGrid.querySelectorAll('.task-card')].forEach(c => c.remove());

  taskCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  if (tasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tasks.forEach(task => {
    const card = createCard(task);
    taskGrid.appendChild(card);
  });
}

// ── CREATE CARD ────────────────────────────────────────────────
function createCard(task) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed';
  const statusClass = 'badge-status-' + task.status.replace(' ', '.');

  const card = document.createElement('div');
  card.className = `task-card ${task.status === 'Completed' ? 'completed' : ''}`;
  card.dataset.priority = task.priority;
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="card-top">
      <h3 class="card-title">${escHtml(task.title)}</h3>
    </div>
    ${task.description ? `<p class="card-desc">${escHtml(task.description)}</p>` : ''}
    <div class="card-meta">
      <span class="badge badge-priority-${task.priority}">${task.priority}</span>
      <span class="badge ${statusClass}">${task.status}</span>
      ${task.due_date ? `<span class="card-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(task.due_date)}</span>` : ''}
    </div>
    <div class="card-actions">
      <button class="btn-edit"   onclick="openEditModal(${task.id})">✏️ Edit</button>
      <button class="btn-delete" onclick="confirmDelete(${task.id})">🗑️ Delete</button>
    </div>
  `;
  return card;
}

// ── UPDATE SIDEBAR STATS ───────────────────────────────────────
async function updateStats() {
  let tasks = getLocalTasks();

  if (useApi) {
    const result = await callApi(API);
    if (result.ok && result.data.success) {
      tasks = result.data.data;
    } else {
      useApi = false;
      showToast('Could not update stats from backend; using local storage.', 'error');
      tasks = getLocalTasks();
    }
  }

  document.getElementById('stat-total').textContent   = tasks.length;
  document.getElementById('stat-pending').textContent = tasks.filter(t => t.status === 'Pending').length;
  document.getElementById('stat-progress').textContent= tasks.filter(t => t.status === 'In Progress').length;
  document.getElementById('stat-done').textContent    = tasks.filter(t => t.status === 'Completed').length;
}

// ── OPEN ADD MODAL ─────────────────────────────────────────────
document.getElementById('btn-open-modal').addEventListener('click', () => {
  resetForm();
  modalTitle.textContent = 'New Task';
  openModal(modalOverlay);
});

// ── OPEN EDIT MODAL ────────────────────────────────────────────
async function openEditModal(id) {
  try {
    const res  = await fetch(`${API}?id=${id}`);
    const data = await res.json();
    if (data.success) {
      const t = data.data;
      taskIdInput.value   = t.id;
      titleInput.value    = t.title;
      descInput.value     = t.description || '';
      priorityInput.value = t.priority;
      statusInput.value   = t.status;
      dueDateInput.value  = t.due_date || '';

      modalTitle.textContent = 'Edit Task';
      openModal(modalOverlay);
      return;
    }
  } catch (e) {
    // ignore and fall back to local storage
  }

  const tasks = getLocalTasks();
  const task = tasks.find(t => Number(t.id) === Number(id));
  if (!task) {
    showToast('Task not found locally.', 'error');
    return;
  }

  taskIdInput.value   = task.id;
  titleInput.value    = task.title;
  descInput.value     = task.description || '';
  priorityInput.value = task.priority;
  statusInput.value   = task.status;
  dueDateInput.value  = task.due_date || '';

  modalTitle.textContent = 'Edit Task';
  openModal(modalOverlay);
}

// ── FORM SUBMIT (CREATE / UPDATE) ──────────────────────────────
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  let valid   = true;

  // Client-side validation
  clearErrors();
  if (!title) {
    setError('err-title', 'Task title is required.');
    titleInput.classList.add('error');
    valid = false;
  }
  if (!valid) return;

  const payload = {
    id:          taskIdInput.value || null,
    title,
    description: descInput.value.trim(),
    priority:    priorityInput.value,
    status:      statusInput.value,
    due_date:    dueDateInput.value || null
  };

  const isEdit  = !!payload.id;
  const method  = isEdit ? 'PUT' : 'POST';
  const saveBtn = document.getElementById('btn-save');

  saveBtn.disabled    = true;
  saveBtn.textContent = 'Saving…';

  let usedLocalFallback = false;
  try {
    const result = await callApi(API, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (result.ok && result.data.success) {
      closeModal(modalOverlay);
      showToast(isEdit ? 'Task updated!' : 'Task created!', 'success');
      fetchTasks();
      return;
    }

    if (result.ok && !result.data.success) {
      const msgs = result.data.errors ? result.data.errors.join(' ') : result.data.message;
      showToast(msgs, 'error');
      return;
    }

    usedLocalFallback = true;
  } catch (e) {
    usedLocalFallback = true;
  }

  if (!usedLocalFallback) {
    const msgs = 'Unable to save task.';
    showToast(msgs, 'error');
    return;
  }

  const tasks = getLocalTasks();
  if (isEdit) {
    const index = tasks.findIndex(t => Number(t.id) === Number(payload.id));
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...payload };
      saveLocalTasks(tasks);
      closeModal(modalOverlay);
      showToast('Task updated locally.', 'success');
      fetchTasks();
    } else {
      showToast('Task not found locally.', 'error');
    }
  } else {
    const newTask = {
      id: getNextLocalId(),
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      status: payload.status,
      due_date: payload.due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    saveLocalTasks(tasks);
    closeModal(modalOverlay);
    showToast('Task saved locally.', 'success');
    fetchTasks();
  }
} finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Save Task';
  }
});

// ── DELETE CONFIRM ─────────────────────────────────────────────
function confirmDelete(id) {
  deleteTargetId = id;
  openModal(confirmOverlay);
}

document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  let deletedLocally = false;

  try {
    const result = await callApi(`${API}?id=${deleteTargetId}`, { method: 'DELETE' });
    if (result.ok && result.data.success) {
      closeModal(confirmOverlay);
      showToast('Task deleted.', 'success');
      fetchTasks();
      deleteTargetId = null;
      return;
    }

    deletedLocally = true;
  } catch (e) {
    deletedLocally = true;
  }

  if (deletedLocally) {
    const tasks = getLocalTasks().filter(t => Number(t.id) !== Number(deleteTargetId));
    saveLocalTasks(tasks);
    closeModal(confirmOverlay);
    showToast('Task deleted locally.', 'success');
    fetchTasks();
    deleteTargetId = null;
  }
});
  }

  if (deletedLocally) {
    const tasks = getLocalTasks().filter(t => Number(t.id) !== Number(deleteTargetId));
    saveLocalTasks(tasks);
    closeModal(confirmOverlay);
    showToast('Task deleted locally.', 'success');
    fetchTasks();
    deleteTargetId = null;
  }
});

// ── FILTERS ────────────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.status;
    fetchTasks();
  });
});

// ── CLOSE BUTTONS ──────────────────────────────────────────────
document.getElementById('btn-close-modal').addEventListener('click', () => closeModal(modalOverlay));
document.getElementById('btn-cancel').addEventListener('click',       () => closeModal(modalOverlay));
document.getElementById('btn-confirm-cancel').addEventListener('click',() => closeModal(confirmOverlay));

// Close on overlay click
[modalOverlay, confirmOverlay].forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
});

// ── HELPERS ────────────────────────────────────────────────────
function openModal(el)  { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

function resetForm() {
  taskForm.reset();
  taskIdInput.value = '';
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
}
function setError(id, msg) {
  document.getElementById(id).textContent = msg;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
