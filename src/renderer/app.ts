const listContainer = document.getElementById('listContainer') as HTMLDivElement;
const promptList = document.getElementById('promptList') as HTMLDivElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;
const emptySetupBtn = document.getElementById('emptySetupBtn') as HTMLButtonElement;
const detailContainer = document.getElementById('detailContainer') as HTMLDivElement;
const detailFilename = document.getElementById('detailFilename') as HTMLSpanElement;
const detailContent = document.getElementById('detailContent') as HTMLTextAreaElement;
const detailRendered = document.getElementById('detailRendered') as HTMLDivElement;
const toggleEditBtn = document.getElementById('toggleEditBtn') as HTMLButtonElement;
const detailCopyBtn = document.getElementById('detailCopyBtn') as HTMLButtonElement;
const detailCopyPathBtn = document.getElementById('detailCopyPathBtn') as HTMLButtonElement;
const detailSaveBtn = document.getElementById('detailSaveBtn') as HTMLButtonElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;
const newPromptBtn = document.getElementById('newPromptBtn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refreshBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
const settingsModal = document.getElementById('settingsModal') as HTMLDivElement;
const closeSettingsBtn = document.getElementById('closeSettingsBtn') as HTMLButtonElement;
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
const openCursorBtn = document.getElementById('openCursorBtn') as HTMLButtonElement;
const directoriesList = document.getElementById('directoriesList') as HTMLDivElement;
const addDirectoryBtn = document.getElementById('addDirectoryBtn') as HTMLButtonElement;

let files: MarkdownFile[] = [];
let directories: Directory[] = [];
let currentDirectory: Directory | null = null;
let defaultDirectoryName: string = '';
let currentFile: { path: string; name: string; content: string } | null = null;
let focusedIndex = -1;
let keyMappings: KeyMappings = {};
let isEditMode = false;

const SVG_ICONS = {
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>',
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  checkmark: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
};

function showModal(modal: HTMLElement): void {
  modal.classList.remove('hidden');
}

function hideModal(modal: HTMLElement): void {
  modal.classList.add('hidden');
}

function isDirty(): boolean {
  if (!currentFile) return false;
  return detailContent.value !== currentFile.content;
}

function isFocusedValid(): boolean {
  return focusedIndex >= 0 && focusedIndex < files.length;
}

function getFocusedFile(): MarkdownFile | null {
  return isFocusedValid() ? files[focusedIndex] : null;
}

function renderOption(value: string, label: string, selected: boolean): string {
  return `<option value="${value}"${selected ? ' selected' : ''}>${label}</option>`;
}

function addOverlayClose(modal: HTMLElement, closeFn: () => void): void {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFn();
  });
}

function getDisplayName(dir: Directory): string {
  return dir.projectPath ? (dir.projectPath.split('/').pop() || dir.name) : dir.name;
}

function refreshDirectoryUI(): void {
  renderDirectoriesList();
  renderDirectoryDropdown();
  updateDefaultDirectorySelect();
  renderKeyMappings();
}

async function reloadDirectories(): Promise<void> {
  directories = await window.api.getDirectories();
}

async function init(): Promise<void> {
  await reloadDirectories();
  keyMappings = await window.api.getKeyMappings();
  defaultDirectoryName = await window.api.getDefaultDirectory();
  
  currentDirectory = directories.find(d => d.name === defaultDirectoryName) ?? directories[0] ?? null;
  
  renderDirectoryDropdown();
  updateDefaultDirectorySelect();
  updateDirectoryDisplay();
  await loadFiles();
}

function getKeyForDirectory(dirName: string): string | null {
  for (const [key, mapped] of Object.entries(keyMappings)) {
    if (mapped === dirName) return key;
  }
  return null;
}

function renderDirectoryDropdown(): void {
  folderDropdown.innerHTML = directories.map(dir => {
    const key = getKeyForDirectory(dir.name);
    return `
    <div class="folder-option${dir === currentDirectory ? ' active' : ''}" data-dir-name="${dir.name}">
      <span class="folder-number">${key || '-'}</span>
      <span>${escapeHtml(getDisplayName(dir))}</span>
    </div>
  `;
  }).join('');
}

function updateDefaultDirectorySelect(): void {
  const current = defaultFolderSelect.value;
  defaultFolderSelect.innerHTML = '<option value="">select default...</option>' +
    directories.map(d => renderOption(d.name, d.name, d.name === current)).join('');
}

function updateDirectoryDisplay(): void {
  if (currentDirectory) {
    folderNameEl.textContent = getDisplayName(currentDirectory);
    if (currentDirectory.projectPath) {
      openCursorBtn.classList.remove('hidden');
    } else {
      openCursorBtn.classList.add('hidden');
    }
  } else {
    folderNameEl.textContent = 'select directory';
    openCursorBtn.classList.add('hidden');
  }
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
          ${directories.map(d => renderOption(d.name, escapeHtml(d.name), d.name === selected)).join('')}
        </select>
      </div>
    `;
  }
  keyMappingsContainer.innerHTML = html;
}

async function loadFiles(): Promise<void> {
  files = currentDirectory ? await window.api.readDirectory(currentDirectory.markdownPath) : [];
  focusedIndex = -1;
  renderFileList();
}

function renderFileList(): void {
  const hasDir = directories.length > 0;
  const emptyP = emptyState.querySelector('p') as HTMLParagraphElement;
  const emptyBtn = emptyState.querySelector('button') as HTMLButtonElement;
  
  const emptyMessage = !hasDir ? 'no directories configured'
    : !currentDirectory ? 'no directory selected'
    : files.length === 0 ? 'no markdown files in this directory'
    : null;
  
  if (emptyMessage) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyP.textContent = emptyMessage;
    emptyBtn.style.display = !hasDir ? 'block' : 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  promptList.style.display = 'flex';
  
  promptList.innerHTML = files.map((f, i) => `
    <div class="prompt-item${i === focusedIndex ? ' focused' : ''}" data-index="${i}" data-path="${f.path}">
      <div class="prompt-content">
        <div class="prompt-title">${escapeHtml(f.title)}</div>
        <div class="prompt-meta">${escapeHtml(f.name)}</div>
        <div class="prompt-preview">${escapeHtml(f.preview)}</div>
      </div>
      <div class="prompt-actions">
        <button class="copy-path-btn" data-path-index="${i}" title="copy file path">
          ${SVG_ICONS.file}
        </button>
        <button class="copy-btn" data-copy-index="${i}" title="copy content">
          ${SVG_ICONS.copy}
        </button>
      </div>
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

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return content;
  return content.substring(endIndex + 3).trim();
}

async function updateDetailView(): Promise<void> {
  if (!currentFile) return;
  
  if (isEditMode) {
    detailContent.classList.remove('hidden');
    detailRendered.classList.add('hidden');
    detailSaveBtn.classList.remove('hidden');
  } else {
    detailContent.classList.add('hidden');
    detailRendered.classList.remove('hidden');
    detailSaveBtn.classList.add('hidden');
    const bodyOnly = stripFrontmatter(detailContent.value);
    const rendered = await window.api.renderMarkdown(bodyOnly);
    detailRendered.innerHTML = rendered;
  }
}

async function toggleEditMode(): Promise<void> {
  isEditMode = !isEditMode;
  await updateDetailView();
}

async function showDetail(filePath: string, fileName: string): Promise<void> {
  const content = await window.api.readFile(filePath);
  if (content === null) return;
  
  currentFile = { path: filePath, name: fileName, content };
  detailFilename.textContent = fileName;
  detailContent.value = content;
  isEditMode = false;
  listContainer.classList.add('hidden');
  detailContainer.classList.remove('hidden');
  await updateDetailView();
}

async function saveCurrentFile(): Promise<boolean> {
  if (!currentFile) return false;
  const success = await window.api.writeFile(currentFile.path, detailContent.value);
  if (success) {
    currentFile.content = detailContent.value;
    isEditMode = false;
    await updateDetailView();
  }
  return success;
}

function hideDetail(): void {
  currentFile = null;
  listContainer.classList.remove('hidden');
  detailContainer.classList.add('hidden');
}

function tryHideDetail(): void {
  isDirty() ? showModal(unsavedModal) : hideDetail();
}

async function copyToClipboardWithFeedback(content: string, button: HTMLButtonElement | null): Promise<void> {
  await window.api.copyToClipboard(content);
  if (!button) return;
  
  button.classList.add('copied');
  const original = button.innerHTML;
  button.innerHTML = SVG_ICONS.checkmark;
  setTimeout(() => { button.classList.remove('copied'); button.innerHTML = original; }, 1500);
}

async function copyFocusedFile(): Promise<void> {
  const f = getFocusedFile();
  if (!f) return;
  const content = await window.api.readFile(f.path);
  if (content) await copyToClipboardWithFeedback(content, promptList.querySelector(`[data-copy-index="${focusedIndex}"]`));
}

async function openFocusedFile(): Promise<void> {
  const f = getFocusedFile();
  if (!f) return;
  await showDetail(f.path, f.name);
}

async function switchDirectory(dir: Directory): Promise<void> {
  currentDirectory = dir;
  updateDirectoryDisplay();
  renderDirectoryDropdown();
  await loadFiles();
  closeDirectoryDropdown();
}

async function switchDirectoryByKey(key: string): Promise<void> {
  const dirName = keyMappings[key];
  const dir = directories.find(d => d.name === dirName);
  if (dir) await switchDirectory(dir);
}

function toggleDirectoryDropdown(): void {
  folderDropdown.classList.toggle('hidden');
  folderBtn.classList.toggle('open');
}

function closeDirectoryDropdown(): void {
  hideModal(folderDropdown);
  folderBtn.classList.remove('open');
}

function renderDirectoriesList(): void {
  directoriesList.innerHTML = directories.map((dir, idx) => `
    <div class="directory-item" data-dir-index="${idx}">
      <div class="directory-item-header">
        <input type="text" class="directory-name-input" value="${escapeHtml(dir.name)}" data-dir-index="${idx}" placeholder="directory name">
        <button class="directory-remove-btn" data-remove-index="${idx}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="directory-path-row">
        <span class="directory-path-label">markdown files</span>
        <div class="directory-path-picker">
          <div class="directory-path-display">${escapeHtml(dir.markdownPath)}</div>
          <button class="directory-path-btn" data-browse-md="${idx}">browse</button>
        </div>
      </div>
      <div class="directory-path-row">
        <span class="directory-path-label">project path (optional)</span>
        <div class="directory-path-picker">
          <div class="directory-path-display">${dir.projectPath ? escapeHtml(dir.projectPath) : 'not set'}</div>
          <button class="directory-path-btn" data-browse-proj="${idx}">browse</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function addNewDirectory(): Promise<void> {
  const mdPath = await window.api.pickDirectory();
  if (!mdPath) return;
  
  const defaultName = mdPath.split('/').pop() || 'new directory';
  const newDir: Directory = { name: defaultName, markdownPath: mdPath };
  
  await window.api.addDirectory(newDir);
  await reloadDirectories();
  refreshDirectoryUI();
}

async function removeDirectory(index: number): Promise<void> {
  const dir = directories[index];
  if (!confirm(`remove directory "${dir.name}"?`)) return;
  
  await window.api.removeDirectory(dir.name);
  await reloadDirectories();
  
  if (currentDirectory?.name === dir.name) {
    currentDirectory = directories[0] ?? null;
    updateDirectoryDisplay();
    await loadFiles();
  }
  
  refreshDirectoryUI();
}

async function updateDirectoryName(oldName: string, newName: string): Promise<void> {
  const dir = directories.find(d => d.name === oldName);
  if (!dir || !newName.trim()) return;
  
  const updated = { ...dir, name: newName };
  await window.api.updateDirectory(oldName, updated);
  await reloadDirectories();
  
  if (currentDirectory?.name === oldName) {
    currentDirectory = directories.find(d => d.name === newName) ?? null;
    updateDirectoryDisplay();
  }
  
  refreshDirectoryUI();
}

async function browseDirectoryPath(index: number, pathType: 'md' | 'proj'): Promise<void> {
  const dir = directories[index];
  const newPath = await window.api.pickDirectory();
  if (!newPath) return;
  
  if (pathType === 'md') {
    dir.markdownPath = newPath;
  } else {
    dir.projectPath = newPath;
  }
  
  await window.api.updateDirectory(dir.name, dir);
  await reloadDirectories();
  
  if (currentDirectory?.name === dir.name) {
    currentDirectory = directories.find(d => d.name === dir.name) ?? null;
    updateDirectoryDisplay();
    if (pathType === 'md') await loadFiles();
  }
  
  renderDirectoriesList();
}

function openSettings(): void {
  defaultFolderSelect.value = defaultDirectoryName;
  renderDirectoriesList();
  renderKeyMappings();
  showModal(settingsModal);
}

function closeSettings(): void { hideModal(settingsModal); }

function openNewFileModal(): void {
  if (!currentDirectory) { openSettings(); return; }
  newPromptInput.value = '';
  showModal(newPromptModal);
  newPromptInput.focus();
}

function closeNewFileModal(): void {
  hideModal(newPromptModal);
  newPromptInput.value = '';
}

async function createNewFile(): Promise<void> {
  const filename = newPromptInput.value.trim();
  if (!filename || !currentDirectory) return;
  
  const sanitized = filename.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
  const result = await window.api.createFile(currentDirectory.markdownPath, sanitized);
  
  if (result.success) {
    closeNewFileModal();
    await loadFiles();
    const newFile = files.find(f => f.path === result.path);
    if (newFile) await showDetail(result.path!, newFile.name);
  } else {
    alert(result.error || 'failed to create file');
  }
}

async function openProjectInCursor(): Promise<void> {
  if (!currentDirectory?.projectPath) return;
  await window.api.openInCursor(currentDirectory.projectPath);
}

folderBtn.addEventListener('click', toggleDirectoryDropdown);

folderDropdown.addEventListener('click', async (e) => {
  const option = (e.target as HTMLElement).closest('.folder-option') as HTMLElement | null;
  if (!option) return;
  const dir = directories.find(d => d.name === option.dataset.dirName);
  if (dir) await switchDirectory(dir);
});

document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.folder-selector')) closeDirectoryDropdown();
});

promptList.addEventListener('click', async (e) => {
  const copyPathBtn = (e.target as HTMLElement).closest('.copy-path-btn') as HTMLButtonElement | null;
  if (copyPathBtn) {
    e.stopPropagation();
    const f = files[parseInt(copyPathBtn.dataset.pathIndex!)];
    await copyToClipboardWithFeedback(f.path, copyPathBtn);
    return;
  }
  
  const copyBtn = (e.target as HTMLElement).closest('.copy-btn') as HTMLButtonElement | null;
  if (copyBtn) {
    e.stopPropagation();
    const f = files[parseInt(copyBtn.dataset.copyIndex!)];
    const content = await window.api.readFile(f.path);
    if (content) await copyToClipboardWithFeedback(content, copyBtn);
    return;
  }
  
  const item = (e.target as HTMLElement).closest('.prompt-item') as HTMLElement | null;
  if (item) {
    focusedIndex = parseInt(item.dataset.index!);
    await showDetail(item.dataset.path!, files[focusedIndex].name);
  }
});

backBtn.addEventListener('click', tryHideDetail);
toggleEditBtn.addEventListener('click', toggleEditMode);
detailSaveBtn.addEventListener('click', saveCurrentFile);
detailCopyPathBtn.addEventListener('click', async () => { if (currentFile) await copyToClipboardWithFeedback(currentFile.path, detailCopyPathBtn); });
detailCopyBtn.addEventListener('click', async () => { if (currentFile) await copyToClipboardWithFeedback(detailContent.value, detailCopyBtn); });

unsavedSaveBtn.addEventListener('click', async () => {
  await saveCurrentFile();
  hideModal(unsavedModal);
  hideDetail();
});

unsavedDiscardBtn.addEventListener('click', () => {
  hideModal(unsavedModal);
  hideDetail();
});

newPromptBtn.addEventListener('click', openNewFileModal);
closeNewPromptBtn.addEventListener('click', closeNewFileModal);
createPromptBtn.addEventListener('click', createNewFile);
newPromptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createNewFile(); } });
refreshBtn.addEventListener('click', loadFiles);
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
openCursorBtn.addEventListener('click', openProjectInCursor);

addOverlayClose(settingsModal, closeSettings);
addOverlayClose(newPromptModal, closeNewFileModal);
addOverlayClose(unsavedModal, () => hideModal(unsavedModal));
emptySetupBtn.addEventListener('click', openSettings);
addDirectoryBtn.addEventListener('click', addNewDirectory);

directoriesList.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  
  const removeBtn = target.closest('.directory-remove-btn') as HTMLButtonElement | null;
  if (removeBtn) {
    const index = parseInt(removeBtn.dataset.removeIndex!);
    await removeDirectory(index);
    return;
  }
  
  const browseMdBtn = target.closest('[data-browse-md]') as HTMLButtonElement | null;
  if (browseMdBtn) {
    const index = parseInt(browseMdBtn.dataset.browseMd!);
    await browseDirectoryPath(index, 'md');
    return;
  }
  
  const browseProjBtn = target.closest('[data-browse-proj]') as HTMLButtonElement | null;
  if (browseProjBtn) {
    const index = parseInt(browseProjBtn.dataset.browseProj!);
    await browseDirectoryPath(index, 'proj');
    return;
  }
});

directoriesList.addEventListener('blur', async (e) => {
  const target = e.target as HTMLInputElement;
  if (target.classList.contains('directory-name-input')) {
    const index = parseInt(target.dataset.dirIndex!);
    const oldName = directories[index].name;
    const newName = target.value.trim();
    if (newName && newName !== oldName) {
      await updateDirectoryName(oldName, newName);
    }
  }
}, true);

defaultFolderSelect.addEventListener('change', () => {
  defaultDirectoryName = defaultFolderSelect.value;
  window.api.setDefaultDirectory(defaultDirectoryName);
});

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
  
  if (e.metaKey && e.key === 's' && !detailContainer.classList.contains('hidden')) {
    e.preventDefault();
    await saveCurrentFile();
    return;
  }
  
  if (e.metaKey && e.key === 'p' && !detailContainer.classList.contains('hidden')) {
    e.preventDefault();
    if (currentFile) await copyToClipboardWithFeedback(currentFile.path, detailCopyPathBtn);
    return;
  }
  
  if (target.tagName === 'TEXTAREA' && e.key !== 'Escape') return;
  if (target.tagName === 'INPUT') return;
  
  if (e.key === 'Escape') {
    const modalsInPriority = [
      { el: unsavedModal, close: () => hideModal(unsavedModal) },
      { el: newPromptModal, close: closeNewFileModal },
      { el: settingsModal, close: closeSettings },
      { el: folderDropdown, close: closeDirectoryDropdown },
      { el: detailContainer, close: tryHideDetail }
    ];
    const openModal = modalsInPriority.find(m => !m.el.classList.contains('hidden'));
    if (openModal) openModal.close();
    return;
  }
  
  if (e.metaKey) {
    if (e.key === ',') { e.preventDefault(); openSettings(); return; }
    if (e.key === 'r') { e.preventDefault(); await loadFiles(); return; }
    if (e.key === 'n') { e.preventDefault(); openNewFileModal(); return; }
    if (e.key === 'o' && currentDirectory?.projectPath) { e.preventDefault(); openProjectInCursor(); return; }
    if (e.key === 'e' && !detailContainer.classList.contains('hidden')) { e.preventDefault(); toggleEditMode(); return; }
  }
  
  if (!detailContainer.classList.contains('hidden')) return;
  
  if (e.key >= '1' && e.key <= '9' && e.metaKey) {
    e.preventDefault();
    await switchDirectoryByKey(e.key);
    return;
  }
  
  if (e.key === 'Tab' && files.length > 0) {
    e.preventDefault();
    focusedIndex = e.shiftKey
      ? (focusedIndex <= 0 ? files.length - 1 : focusedIndex - 1)
      : (focusedIndex >= files.length - 1 ? 0 : focusedIndex + 1);
    updateFocus();
    return;
  }
  
  if (e.key === 'Enter' && focusedIndex >= 0) { e.preventDefault(); await openFocusedFile(); return; }
  if (e.key === 'c' && e.metaKey && focusedIndex >= 0) { e.preventDefault(); await copyFocusedFile(); return; }
  if (e.key === 'p' && e.metaKey && focusedIndex >= 0) { 
    e.preventDefault(); 
    const f = getFocusedFile();
    if (f) await copyToClipboardWithFeedback(f.path, promptList.querySelector(`[data-path-index="${focusedIndex}"]`));
  }
});

let tooltipEl: HTMLDivElement | null = null;
let tooltipArrow: HTMLDivElement | null = null;

function createTooltip(): void {
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tooltip';
  document.body.appendChild(tooltipEl);
  
  tooltipArrow = document.createElement('div');
  tooltipArrow.className = 'tooltip-arrow';
  document.body.appendChild(tooltipArrow);
}

function showTooltip(target: HTMLElement, text: string): void {
  if (!tooltipEl || !tooltipArrow) return;
  
  tooltipEl.textContent = text;
  tooltipEl.classList.add('show');
  tooltipArrow.classList.add('show');
  
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();
  
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  const right = left + tooltipRect.width;
  
  if (right > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  if (left < 8) {
    left = 8;
  }
  
  const top = rect.bottom + 8;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
  
  const arrowLeft = rect.left + rect.width / 2 - 4;
  tooltipArrow.style.left = `${arrowLeft}px`;
  tooltipArrow.style.top = `${rect.bottom + 2}px`;
}

function hideTooltip(): void {
  if (!tooltipEl || !tooltipArrow) return;
  tooltipEl.classList.remove('show');
  tooltipArrow.classList.remove('show');
}

document.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  const titleEl = target.closest('[title]') as HTMLElement | null;
  if (titleEl?.title) {
    showTooltip(titleEl, titleEl.title);
  }
});

document.addEventListener('mouseout', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('[title]')) {
    hideTooltip();
  }
});

createTooltip();
listContainer.classList.remove('hidden');
init();
