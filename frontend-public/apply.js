const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const form = document.getElementById('applyForm');
const confirmationPanel = document.getElementById('confirmationPanel');
const formNotice = document.getElementById('formNotice');
const submitBtn = document.getElementById('submitBtn');

const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const positionSelect = document.getElementById('position');
const resumeInput = document.getElementById('resume');
const dropzone = document.getElementById('dropzone');
const dropzoneLabel = document.getElementById('dropzoneLabel');
const resumeFilename = document.getElementById('resumeFilename');

let selectedFile = null;

// ---- Load positions from the backend on page load ----
async function loadPositions() {
  try {
    const res = await fetch(`${API_URL}/applications/positions`);
    const data = await res.json();
    positionSelect.innerHTML = '<option value="">Select a position…</option>';
    data.positions.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      positionSelect.appendChild(opt);
    });
  } catch (err) {
    positionSelect.innerHTML = '<option value="">Could not load positions</option>';
    showNotice('error', 'Could not load position list. Please make sure the backend server is running, then refresh this page.');
  }
}
loadPositions();

// ---- File selection (click or drag-drop) ----
resumeInput.addEventListener('change', (e) => {
  setSelectedFile(e.target.files[0]);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dropzone--active');
});
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dropzone--active');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dropzone--active');
  if (e.dataTransfer.files[0]) {
    setSelectedFile(e.dataTransfer.files[0]);
  }
});

function setSelectedFile(file) {
  selectedFile = file || null;
  resumeFilename.textContent = selectedFile ? selectedFile.name : '';
  dropzoneLabel.textContent = selectedFile ? 'Replace file' : 'Drop your PDF here, or click to browse';
  clearFieldError('resume');
}

// ---- Validation ----
function validate() {
  let valid = true;
  clearAllFieldErrors();

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const position = positionSelect.value;

  if (!fullName || fullName.length < 2) {
    setFieldError('fullName', 'Enter your full name (at least 2 characters).');
    valid = false;
  }
  if (!EMAIL_REGEX.test(email)) {
    setFieldError('email', 'Enter a valid email address.');
    valid = false;
  }
  if (!position) {
    setFieldError('position', 'Select the position you’re applying for.');
    valid = false;
  }
  if (!selectedFile) {
    setFieldError('resume', 'Attach your resume as a PDF.');
    valid = false;
  } else if (selectedFile.type !== 'application/pdf') {
    setFieldError('resume', 'Resume must be a PDF file.');
    valid = false;
  } else if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
    setFieldError('resume', 'Resume must be smaller than 5MB.');
    valid = false;
  }

  return valid;
}

function setFieldError(field, message) {
  document.getElementById(`${field}Field`).classList.add('field-error');
  document.getElementById(`${field}Error`).textContent = message;
}
function clearFieldError(field) {
  document.getElementById(`${field}Field`).classList.remove('field-error');
  document.getElementById(`${field}Error`).textContent = '';
}
function clearAllFieldErrors() {
  ['fullName', 'email', 'position', 'resume'].forEach(clearFieldError);
}

function showNotice(type, message) {
  formNotice.innerHTML = `<div class="notice notice-${type}">${escapeHtml(message)}</div>`;
}
function clearNotice() {
  formNotice.innerHTML = '';
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Clear individual field errors as the user types/selects
fullNameInput.addEventListener('input', () => clearFieldError('fullName'));
emailInput.addEventListener('input', () => clearFieldError('email'));
positionSelect.addEventListener('change', () => clearFieldError('position'));

// ---- Submit ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearNotice();

  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const formData = new FormData();
  formData.append('fullName', fullNameInput.value.trim());
  formData.append('email', emailInput.value.trim());
  formData.append('position', positionSelect.value);
  formData.append('resume', selectedFile);

  try {
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      const message = (data.errors && data.errors.join(' ')) || data.message || 'Something went wrong. Please try again.';
      throw new Error(message);
    }

    showConfirmation(data.application);
  } catch (err) {
    showNotice('error', err.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit application';
  }
});

function showConfirmation(application) {
  form.style.display = 'none';
  confirmationPanel.style.display = 'block';

  const firstName = application.fullName.split(' ')[0];
  document.getElementById('confirmationText').textContent =
    `Thanks, ${firstName} — we've logged your application for ${application.position}. ` +
    `A recruiter will reach out at ${application.email} if there's a match.`;
  document.getElementById('confirmationId').textContent = `Reference ID: ${application.applicationId}`;
}

document.getElementById('applyAgainBtn').addEventListener('click', () => {
  form.reset();
  setSelectedFile(null);
  clearAllFieldErrors();
  clearNotice();
  confirmationPanel.style.display = 'none';
  form.style.display = 'block';
});
