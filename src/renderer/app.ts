const listContainer = document.getElementById('listContainer') as HTMLDivElement;
const promptList = document.getElementById('promptList') as HTMLDivElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const emptySetupBtn = document.getElementById('emptySetupBtn') as HTMLButtonElement;
const detailContainer = document.getElementById('detailContainer') as HTMLDivElement;
const detailFilename = document.getElementById('detailFilename') as HTMLSpanElement;
const detailContent = document.getElementById('detailContent') as HTMLTextAreaElement;
const detailCopyBtn = document.getElementById('detailCopyBtn') as HTMLButtonElement;
const detailSaveBtn = document.getElementById('detailSaveBtn') as HTMLButtonElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const newPromptBtn = document.getElementById('newPromptBtn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const settingsModal = document.getElementById('settingsModal') as HTMLDivElement;
const closeSettingsBtn = document.getElementById('closeSettingsBtn') as HTMLButtonElement;
const directoryInput = document.getElementById('directoryInput') as HTMLInputElement;
const browseBtn = document.getElementById('browseBtn') as HTMLButtonElement;
const defaultFolderSelect = document.getElementById('defaultFolderSelect') as HTMLSelectElement;
const folderBtn = document.getElementById('folderBtn') as HTMLButtonElement;
const folderNameEl = document.getElementById('folderName') as HTMLSpanElement;
const folderDropdown = document.getElementById('folderDropdown') as HTMLDivElement;
const newPromptModal = document.getElementById('newPromptModal') as HTMLDivElement;
const closeNewPromptBtn = document.getElementById('closeNewPromptBtn') as HTMLButtonElement;
const newPromptInput = document.getElementById('newPromptInput') as HTMLInputElement;
const createPromptBtn = document.getElementById('createPromptBtn') as HTMLButtonElement;
const keyMappingsContainer = document.getElementById('keyMappings') as HTMLDivElement;
const unsavedModal = document.getElementById('unsavedModal') as HTMLDivElement;
const unsavedSaveBtn = document.getElementById('unsavedSaveBtn') as HTMLButtonElement;
const unsavedDiscardBtn = document.getElementById('unsavedDiscardBtn') as HTMLButtonElement;

let prompts: PromptFile[] = [];
let folders: string[] = [];
let currentFolder: string | null = null;
let currentFile: { path: string; name: string; content: string } | null = null;
let focusedIndex = -1;
let keyMappings: KeyMappings = {};

function isDirty(): boolean {
  if (!currentFile) return false;
  return detailContent.value !== currentFile.content;
}

async function init(): Promise<void> {
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

function getKeyForFolder(folder: string): string | null {
  for (const [key, mapped] of Object.entries(keyMappings)) {
    if (mapped === folder) return key;
  }
  return null;
}

function renderFolderDropdown(): void {
  folderDropdown.innerHTML = folders.map(folder => {
    const key = getKeyForFolder(folder);
    return `
    <div class="folder-option${folder === currentFolder ? ' active' : ''}" data-folder="${folder}">
      <span class="folder-number">${key || '-'}</span>
      <span>${escapeHtml(folder)}</span>
    </div>
  `;
  }).join('');
}

function updateDefaultFolderSelect(): void {
  const current = defaultFolderSelect.value;
  defaultFolderSelect.innerHTML = '<option value="">select default folder...</option>' +
    folders.map(f => `<option value="${f}"${f === current ? ' selected' : ''}>${f}</option>`).join('');
}

function updateFolderDisplay(): void {
  folderNameEl.textContent = currentFolder || 'select folder';
}

function renderKeyMappings(): void {
  let html = '';
  for (let i = 1; i <= 9; i++) {
    const key = String(i);
    const selected = keyMappings[key] || '';
    html += `
      <div class="key-mapping-row">
        <span class="key-badge">${i}</span>
        <select class="key-mapping-select" data-key="${key}">
          <option value="">not assigned</option>
          ${folders.map(f => `<option value="${f}"${f === selected ? ' selected' : ''}>${escapeHtml(f)}</option>`).join('')}
        </select>
      </div>
    `;
  }
  keyMappingsContainer.innerHTML = html;
}

async function loadPrompts(): Promise<void> {
  prompts = currentFolder ? await window.api.readPrompts(currentFolder) : [];
  focusedIndex = -1;
  renderPromptList();
}

function renderPromptList(): void {
  const hasDir = directoryInput.value.trim() !== '';
  const emptyP = emptyState.querySelector('p') as HTMLParagraphElement;
  const emptyBtn = emptyState.querySelector('button') as HTMLButtonElement;
  
  if (!hasDir) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyP.textContent = 'no prompts directory configured';
    emptyBtn.style.display = 'block';
    return;
  }
  
  if (!currentFolder) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyP.textContent = 'no folder selected';
    emptyBtn.style.display = 'none';
    return;
  }
  
  if (prompts.length === 0) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyP.textContent = 'no prompts in this folder';
    emptyBtn.style.display = 'none';
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
      <button class="copy-btn" data-copy-index="${i}" title="copy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

function updateFocus(): void {
  const items = promptList.querySelectorAll('.prompt-item');
  items.forEach((item, i) => item.classList.toggle('focused', i === focusedIndex));
  if (focusedIndex >= 0 && items[focusedIndex]) {
    items[focusedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function showDetail(filePath: string, fileName: string): Promise<void> {
  const content = await window.api.readFile(filePath);
  if (content === null) return;
  
  currentFile = { path: filePath, name: fileName, content };
  detailFilename.textContent = fileName;
  detailContent.value = content;
  listContainer.classList.add('hidden');
  detailContainer.classList.remove('hidden');
}

async function saveCurrentFile(): Promise<boolean> {
  if (!currentFile) return false;
  const success = await window.api.writeFile(currentFile.path, detailContent.value);
  if (success) {
    currentFile.content = detailContent.value;
  }
  return success;
}

function hideDetail(): void {
  currentFile = null;
  listContainer.classList.remove('hidden');
  detailContainer.classList.add('hidden');
}

function tryHideDetail(): void {
  if (isDirty()) {
    unsavedModal.classList.remove('hidden');
  } else {
    hideDetail();
  }
}

async function copyContent(content: string, button: HTMLButtonElement | null): Promise<void> {
  await window.api.copyToClipboard(content);
  if (!button) return;
  
  button.classList.add('copied');
  const original = button.innerHTML;
  button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
  setTimeout(() => { button.classList.remove('copied'); button.innerHTML = original; }, 1500);
}

async function copyFocusedPrompt(): Promise<void> {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  const p = prompts[focusedIndex];
  const content = await window.api.readFile(p.path);
  if (content) await copyContent(content, promptList.querySelector(`[data-copy-index="${focusedIndex}"]`));
}

async function openFocusedPrompt(): Promise<void> {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  const p = prompts[focusedIndex];
  await showDetail(p.path, p.name);
}

async function switchToFolderByKey(key: string): Promise<void> {
  const folder = keyMappings[key];
  if (!folder || !folders.includes(folder)) return;
  currentFolder = folder;
  updateFolderDisplay();
  renderFolderDropdown();
  await loadPrompts();
  closeFolderDropdown();
}

function toggleFolderDropdown(): void { folderDropdown.classList.toggle('hidden'); }
function closeFolderDropdown(): void { folderDropdown.classList.add('hidden'); }

async function openSettings(): Promise<void> {
  defaultFolderSelect.value = await window.api.getDefaultFolder() || '';
  keyMappings = await window.api.getKeyMappings() || {};
  renderKeyMappings();
  settingsModal.classList.remove('hidden');
}

function closeSettings(): void { settingsModal.classList.add('hidden'); }

function openNewPromptModal(): void {
  if (!currentFolder) { openSettings(); return; }
  newPromptInput.value = '';
  newPromptModal.classList.remove('hidden');
  newPromptInput.focus();
}

function closeNewPromptModal(): void {
  newPromptModal.classList.add('hidden');
  newPromptInput.value = '';
}

async function createNewPrompt(): Promise<void> {
  const filename = newPromptInput.value.trim();
  if (!filename || !currentFolder) return;
  
  const sanitized = filename.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
  const result = await window.api.createPrompt(currentFolder, sanitized);
  
  if (result.success) {
    closeNewPromptModal();
    await loadPrompts();
    const newPrompt = prompts.find(p => p.path === result.path);
    if (newPrompt) await showDetail(result.path!, newPrompt.name);
  } else {
    alert(result.error || 'failed to create prompt');
  }
}

async function browseDirectory(): Promise<void> {
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
  const option = (e.target as HTMLElement).closest('.folder-option') as HTMLElement | null;
  if (!option) return;
  currentFolder = option.dataset.folder!;
  updateFolderDisplay();
  renderFolderDropdown();
  await loadPrompts();
  closeFolderDropdown();
});

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.folder-selector')) closeFolderDropdown();
});

promptList.addEventListener('click', async (e) => {
  const copyBtn = (e.target as HTMLElement).closest('.copy-btn') as HTMLButtonElement | null;
  if (copyBtn) {
    e.stopPropagation();
    const p = prompts[parseInt(copyBtn.dataset.copyIndex!)];
    const content = await window.api.readFile(p.path);
    if (content) await copyContent(content, copyBtn);
    return;
  }
  
  const item = (e.target as HTMLElement).closest('.prompt-item') as HTMLElement | null;
  if (item) {
    focusedIndex = parseInt(item.dataset.index!);
    await showDetail(item.dataset.path!, prompts[focusedIndex].name);
  }
});

backBtn.addEventListener('click', tryHideDetail);
detailSaveBtn.addEventListener('click', saveCurrentFile);
detailCopyBtn.addEventListener('click', async () => { if (currentFile) await copyContent(detailContent.value, detailCopyBtn); });

unsavedSaveBtn.addEventListener('click', async () => {
  await saveCurrentFile();
  unsavedModal.classList.add('hidden');
  hideDetail();
});

unsavedDiscardBtn.addEventListener('click', () => {
  unsavedModal.classList.add('hidden');
  hideDetail();
});

unsavedModal.addEventListener('click', (e) => {
  if (e.target === unsavedModal) unsavedModal.classList.add('hidden');
});

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
  const target = e.target as HTMLSelectElement;
  if (!target.classList.contains('key-mapping-select')) return;
  const key = target.dataset.key!;
  if (target.value) keyMappings[key] = target.value;
  else delete keyMappings[key];
  await window.api.setKeyMappings(keyMappings);
});

document.addEventListener('keydown', async (e) => {
  const target = e.target as HTMLElement;
  
  // Handle Cmd+S in detail view (even in textarea)
  if (e.metaKey && e.key === 's' && !detailContainer.classList.contains('hidden')) {
    e.preventDefault();
    await saveCurrentFile();
    return;
  }
  
  // Don't handle other shortcuts if in textarea (except Escape)
  if (target.tagName === 'TEXTAREA' && e.key !== 'Escape') return;
  if (target.tagName === 'INPUT') return;
  
  if (e.key === 'Escape') {
    if (!unsavedModal.classList.contains('hidden')) unsavedModal.classList.add('hidden');
    else if (!newPromptModal.classList.contains('hidden')) closeNewPromptModal();
    else if (!settingsModal.classList.contains('hidden')) closeSettings();
    else if (!folderDropdown.classList.contains('hidden')) closeFolderDropdown();
    else if (!detailContainer.classList.contains('hidden')) tryHideDetail();
    return;
  }
  
  if (e.metaKey) {
    if (e.key === ',') { e.preventDefault(); openSettings(); return; }
    if (e.key === 'r') { e.preventDefault(); await loadPrompts(); return; }
    if (e.key === 'n') { e.preventDefault(); openNewPromptModal(); return; }
  }
  
  if (!detailContainer.classList.contains('hidden')) return;
  
  if (e.key >= '1' && e.key <= '9' && e.metaKey) {
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
