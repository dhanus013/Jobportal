const STATUSES = ['Pending', 'Shortlisted', 'Rejected', 'Selected'];
const STAMP_CLASS = {
  Pending: 'stamp-pending',
  Shortlisted: 'stamp-shortlisted',
  Selected: 'stamp-selected',
  Rejected: 'stamp-rejected',
};

const dashboardContent = document.getElementById('dashboardContent');
const dashboardNotice = document.getElementById('dashboardNotice');
const searchInput = document.getElementById('search');
const positionFilter = document.getElementById('positionFilter');
const statusFilter = document.getElementById('statusFilter');

let applications = [];
let debounceTimer = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showNotice(type, message) {
  dashboardNotice.innerHTML = `<div class="notice notice-${type}">${escapeHtml(message)}</div>`;
}
function clearNotice() {
  dashboardNotice.innerHTML = '';
}

async function loadApplications() {
  clearNotice();
  dashboardContent.innerHTML = '<div class="loading-state">Loading applications…</div>';

  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (positionFilter.value) params.set('position', positionFilter.value);
  if (statusFilter.value) params.set('status', statusFilter.value);

  try {
    const res = await fetch(`${API_URL}/admin/applications?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load applications.');

    applications = data.applications;
    populatePositionFilter(applications);
    updateStats(applications);
    renderTable(applications);
  } catch (err) {
    dashboardContent.innerHTML = '';
    showNotice('error', err.message || 'Could not reach the server. Is the backend running on port 5000?');
  }
}

function populatePositionFilter(apps) {
  const current = positionFilter.value;
  const positions = Array.from(new Set(apps.map((a) => a.position))).sort();
  positionFilter.innerHTML = '<option value="">All positions</option>' +
    positions.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  positionFilter.value = current;
}

function updateStats(apps) {
  const counts = { Pending: 0, Shortlisted: 0, Rejected: 0, Selected: 0 };
  apps.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });
  document.getElementById('countPending').textContent = counts.Pending;
  document.getElementById('countShortlisted').textContent = counts.Shortlisted;
  document.getElementById('countRejected').textContent = counts.Rejected;
  document.getElementById('countSelected').textContent = counts.Selected;
}

function renderTable(apps) {
  if (apps.length === 0) {
    dashboardContent.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__icon">🗂️</span>
        No applications match these filters yet.
      </div>`;
    return;
  }

  const rows = apps.map((a) => `
    <tr data-id="${escapeHtml(a.applicationId)}">
      <td>
        <div class="ledger__name">${escapeHtml(a.fullName)}</div>
        <div class="ledger__email">${escapeHtml(a.email)}</div>
      </td>
      <td>${escapeHtml(a.position)}</td>
      <td>${new Date(a.submittedAt).toLocaleDateString()}</td>
      <td><span class="stamp ${STAMP_CLASS[a.status] || 'stamp-pending'}">${escapeHtml(a.status)}</span></td>
      <td>
        <div class="row-actions">
          <select class="status-select" data-action="status">
            ${STATUSES.map((s) => `<option value="${s}" ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="icon-btn" data-action="download">Resume</button>
          <button class="icon-btn icon-btn--danger" data-action="delete">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  dashboardContent.innerHTML = `
    <div class="ledger">
      <table>
        <thead>
          <tr><th>Applicant</th><th>Position</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  attachRowHandlers();
}

function attachRowHandlers() {
  dashboardContent.querySelectorAll('tr[data-id]').forEach((row) => {
    const applicationId = row.getAttribute('data-id');
    const app = applications.find((a) => a.applicationId === applicationId);

    row.querySelector('[data-action="status"]').addEventListener('change', (e) => {
      handleStatusChange(applicationId, e.target.value);
    });
    row.querySelector('[data-action="download"]').addEventListener('click', () => {
      handleDownload(applicationId);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      handleDelete(applicationId, app.fullName);
    });
  });
}

async function handleStatusChange(applicationId, newStatus) {
  try {
    const res = await fetch(`${API_URL}/admin/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update status.');

    const app = applications.find((a) => a.applicationId === applicationId);
    if (app) app.status = newStatus;
    updateStats(applications);
    renderTable(applications);
  } catch (err) {
    alert(err.message);
  }
}

async function handleDownload(applicationId) {
  try {
    const res = await fetch(`${API_URL}/admin/applications/${applicationId}/resume`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get resume link.');
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    alert(err.message);
  }
}

async function handleDelete(applicationId, name) {
  if (!window.confirm(`Remove ${name}'s application? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API_URL}/admin/applications/${applicationId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete application.');

    applications = applications.filter((a) => a.applicationId !== applicationId);
    updateStats(applications);
    renderTable(applications);
  } catch (err) {
    alert(err.message);
  }
}

// Debounced reload on search/filter change
function scheduleReload() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadApplications, 250);
}
searchInput.addEventListener('input', scheduleReload);
positionFilter.addEventListener('change', loadApplications);
statusFilter.addEventListener('change', loadApplications);

loadApplications();
