const listContainer = document.getElementById('listContainer');
const promptList = document.getElementById('promptList');
const emptyState = document.getElementById('emptyState');
const emptySetupBtn = document.getElementById('emptySetupBtn');
const detailContainer = document.getElementById('detailContainer');
const detailFilename = document.getElementById('detailFilename');
const detailContent = document.getElementById('detailContent');
const detailCopyBtn = document.getElementById('detailCopyBtn');
const backBtn = document.getElementById('backBtn');
const newPromptBtn = document.getElementById('newPromptBtn');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const directoryInput = document.getElementById('directoryInput');
const browseBtn = document.getElementById('browseBtn');
const defaultFolderSelect = document.getElementById('defaultFolderSelect');
const folderBtn = document.getElementById('folderBtn');
const folderName = document.getElementById('folderName');
const folderDropdown = document.getElementById('folderDropdown');
const newPromptModal = document.getElementById('newPromptModal');
const closeNewPromptBtn = document.getElementById('closeNewPromptBtn');
const newPromptInput = document.getElementById('newPromptInput');
const createPromptBtn = document.getElementById('createPromptBtn');
const keyMappingsContainer = document.getElementById('keyMappings');

let prompts = [];
let folders = [];
let currentFolder = null;
let currentFile = null;
let focusedIndex = -1;
let keyMappings = {};

async function init() {
  const dir = await window.api.getDirectory();
  directoryInput.value = dir || '';
  
  folders = await window.api.listFolders();
  keyMappings = await window.api.getKeyMappings() || {};
  
  const defaultFolder = await window.api.getDefaultFolder();
  currentFolder = (defaultFolder && folders.includes(defaultFolder)) ? defaultFolder : folders[0] || null;
  
  renderFolderDropdown();
  updateDefaultFolderSelect();
  updateFolderDisplay();
  await loadPrompts();
}

function renderFolderDropdown() {
  folderDropdown.innerHTML = folders.map((folder, i) => `
    <div class="folder-option${folder === currentFolder ? ' active' : ''}" data-folder="${folder}">
      <span class="folder-number">${i + 1}</span>
      <span>${escapeHtml(folder)}</span>
    </div>
  `).join('');
}

function updateDefaultFolderSelect() {
  const current = defaultFolderSelect.value;
  defaultFolderSelect.innerHTML = '<option value="">Select default folder...</option>' +
    folders.map(f => `<option value="${f}"${f === current ? ' selected' : ''}>${f}</option>`).join('');
}

function updateFolderDisplay() {
  folderName.textContent = currentFolder || 'Select Folder';
}

function renderKeyMappings() {
  let html = '';
  for (let i = 1; i <= 9; i++) {
    const key = String(i);
    const selected = keyMappings[key] || '';
    html += `
      <div class="key-mapping-row">
        <span class="key-badge">${i}</span>
        <select class="key-mapping-select" data-key="${key}">
          <option value="">Not assigned</option>
          ${folders.map(f => `<option value="${f}"${f === selected ? ' selected' : ''}>${escapeHtml(f)}</option>`).join('')}
        </select>
      </div>
    `;
  }
  keyMappingsContainer.innerHTML = html;
}

async function loadPrompts() {
  prompts = currentFolder ? await window.api.readPrompts(currentFolder) : [];
  focusedIndex = -1;
  renderPromptList();
}

function renderPromptList() {
  const hasDir = directoryInput.value.trim() !== '';
  
  if (!hasDir) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyState.querySelector('p').textContent = 'No prompts directory configured';
    emptyState.querySelector('button').style.display = 'block';
    return;
  }
  
  if (!currentFolder) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyState.querySelector('p').textContent = 'No folder selected';
    emptyState.querySelector('button').style.display = 'none';
    return;
  }
  
  if (prompts.length === 0) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyState.querySelector('p').textContent = 'No prompts in this folder';
    emptyState.querySelector('button').style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  promptList.style.display = 'flex';
  
  promptList.innerHTML = prompts.map((p, i) => `
    <div class="prompt-item${i === focusedIndex ? ' focused' : ''}" data-index="${i}" data-path="${p.path}">
      <div class="prompt-content">
        <div class="prompt-title">${escapeHtml(p.title)}</div>
        <div class="prompt-meta">${escapeHtml(p.name)}</div>
        <div class="prompt-preview">${escapeHtml(p.preview)}</div>
      </div>
      <button class="copy-btn" data-copy-index="${i}" title="Copy content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

function updateFocus() {
  const items = promptList.querySelectorAll('.prompt-item');
  items.forEach((item, i) => item.classList.toggle('focused', i === focusedIndex));
  if (focusedIndex >= 0 && items[focusedIndex]) {
    items[focusedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function showDetail(filePath, fileName) {
  const content = await window.api.readFile(filePath);
  if (content === null) return;
  
  currentFile = { path: filePath, name: fileName, content };
  detailFilename.textContent = fileName;
  detailContent.textContent = content;
  listContainer.classList.add('hidden');
  detailContainer.classList.remove('hidden');
}

function hideDetail() {
  currentFile = null;
  listContainer.classList.remove('hidden');
  detailContainer.classList.add('hidden');
}

async function copyContent(content, button) {
  await window.api.copyToClipboard(content);
  if (!button) return;
  
  button.classList.add('copied');
  const original = button.innerHTML;
  button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
  setTimeout(() => { button.classList.remove('copied'); button.innerHTML = original; }, 1500);
}

async function copyFocusedPrompt() {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  const p = prompts[focusedIndex];
  const content = await window.api.readFile(p.path);
  if (content) await copyContent(content, promptList.querySelector(`[data-copy-index="${focusedIndex}"]`));
}

async function openFocusedPrompt() {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  const p = prompts[focusedIndex];
  await showDetail(p.path, p.name);
}

async function switchToFolderByKey(key) {
  const folder = keyMappings[key];
  if (!folder || !folders.includes(folder)) return;
  currentFolder = folder;
  updateFolderDisplay();
  renderFolderDropdown();
  await loadPrompts();
  closeFolderDropdown();
}

function toggleFolderDropdown() { folderDropdown.classList.toggle('hidden'); }
function closeFolderDropdown() { folderDropdown.classList.add('hidden'); }

async function openSettings() {
  defaultFolderSelect.value = await window.api.getDefaultFolder() || '';
  keyMappings = await window.api.getKeyMappings() || {};
  renderKeyMappings();
  settingsModal.classList.remove('hidden');
}

function closeSettings() { settingsModal.classList.add('hidden'); }

function openNewPromptModal() {
  if (!currentFolder) { openSettings(); return; }
  newPromptInput.value = '';
  newPromptModal.classList.remove('hidden');
  newPromptInput.focus();
}

function closeNewPromptModal() {
  newPromptModal.classList.add('hidden');
  newPromptInput.value = '';
}

async function createNewPrompt() {
  const filename = newPromptInput.value.trim();
  if (!filename) return;
  
  const sanitized = filename.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
  const result = await window.api.createPrompt(currentFolder, sanitized);
  
  if (result.success) {
    closeNewPromptModal();
    await loadPrompts();
    const newPrompt = prompts.find(p => p.path === result.path);
    if (newPrompt) await showDetail(result.path, newPrompt.name);
  } else {
    alert(result.error || 'Failed to create prompt');
  }
}

async function browseDirectory() {
  const dir = await window.api.pickDirectory();
  if (!dir) return;
  
  directoryInput.value = dir;
  folders = await window.api.listFolders();
  renderFolderDropdown();
  updateDefaultFolderSelect();
  
  if (folders.length > 0) currentFolder = folders[0];
  updateFolderDisplay();
  await loadPrompts();
}


// Event listeners

folderBtn.addEventListener('click', toggleFolderDropdown);

folderDropdown.addEventListener('click', async (e) => {
  const option = e.target.closest('.folder-option');
  if (!option) return;
  currentFolder = option.dataset.folder;
  updateFolderDisplay();
  renderFolderDropdown();
  await loadPrompts();
  closeFolderDropdown();
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.folder-selector')) closeFolderDropdown();
});

promptList.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    e.stopPropagation();
    const p = prompts[parseInt(copyBtn.dataset.copyIndex)];
    const content = await window.api.readFile(p.path);
    if (content) await copyContent(content, copyBtn);
    return;
  }
  
  const item = e.target.closest('.prompt-item');
  if (item) {
    focusedIndex = parseInt(item.dataset.index);
    await showDetail(item.dataset.path, prompts[focusedIndex].name);
  }
});

backBtn.addEventListener('click', hideDetail);
detailCopyBtn.addEventListener('click', async () => { if (currentFile) await copyContent(currentFile.content, detailCopyBtn); });
newPromptBtn.addEventListener('click', openNewPromptModal);
closeNewPromptBtn.addEventListener('click', closeNewPromptModal);
createPromptBtn.addEventListener('click', createNewPrompt);
newPromptModal.addEventListener('click', (e) => { if (e.target === newPromptModal) closeNewPromptModal(); });
newPromptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createNewPrompt(); } });
refreshBtn.addEventListener('click', loadPrompts);
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
browseBtn.addEventListener('click', browseDirectory);
emptySetupBtn.addEventListener('click', browseDirectory);

defaultFolderSelect.addEventListener('change', () => window.api.setDefaultFolder(defaultFolderSelect.value));

keyMappingsContainer.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('key-mapping-select')) return;
  const key = e.target.dataset.key;
  if (e.target.value) keyMappings[key] = e.target.value;
  else delete keyMappings[key];
  await window.api.setKeyMappings(keyMappings);
});

document.addEventListener('keydown', async (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key === 'Escape') {
    if (!newPromptModal.classList.contains('hidden')) closeNewPromptModal();
    else if (!settingsModal.classList.contains('hidden')) closeSettings();
    else if (!folderDropdown.classList.contains('hidden')) closeFolderDropdown();
    else if (!detailContainer.classList.contains('hidden')) hideDetail();
    return;
  }
  
  if (e.metaKey) {
    if (e.key === ',') { e.preventDefault(); openSettings(); return; }
    if (e.key === 'r') { e.preventDefault(); await loadPrompts(); return; }
    if (e.key === 'n') { e.preventDefault(); openNewPromptModal(); return; }
  }
  
  // List view only shortcuts
  if (!detailContainer.classList.contains('hidden')) return;
  
  if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    await switchToFolderByKey(e.key);
    return;
  }
  
  if (e.key === 'Tab' && prompts.length > 0) {
    e.preventDefault();
    focusedIndex = e.shiftKey
      ? (focusedIndex <= 0 ? prompts.length - 1 : focusedIndex - 1)
      : (focusedIndex >= prompts.length - 1 ? 0 : focusedIndex + 1);
    updateFocus();
    return;
  }
  
  if (e.key === 'Enter' && focusedIndex >= 0) { e.preventDefault(); await openFocusedPrompt(); return; }
  if (e.key === 'c' && e.metaKey && focusedIndex >= 0) { e.preventDefault(); await copyFocusedPrompt(); }
});

listContainer.classList.remove('hidden');
init();
