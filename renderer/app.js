// DOM Elements
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

// State
let prompts = [];
let folders = [];
let currentFolder = null;
let currentFile = null;
let focusedIndex = -1;

// Initialize app
async function init() {
  await loadDirectory();
  await loadFolders();
  
  // Load default folder or first available
  const defaultFolder = await window.api.getDefaultFolder();
  if (defaultFolder && folders.includes(defaultFolder)) {
    currentFolder = defaultFolder;
  } else if (folders.length > 0) {
    currentFolder = folders[0];
  }
  
  updateFolderDisplay();
  await loadPrompts();
}

// Load directory from settings
async function loadDirectory() {
  const dir = await window.api.getDirectory();
  directoryInput.value = dir || '';
}

// Load folders
async function loadFolders() {
  folders = await window.api.listFolders();
  renderFolderDropdown();
  updateDefaultFolderSelect();
}

// Render folder dropdown
function renderFolderDropdown() {
  folderDropdown.innerHTML = folders.map((folder, index) => `
    <div class="folder-option${folder === currentFolder ? ' active' : ''}" data-folder="${folder}">
      <span class="folder-number">${index + 1}</span>
      <span>${escapeHtml(folder)}</span>
    </div>
  `).join('');
}

// Update default folder select in settings
function updateDefaultFolderSelect() {
  const currentDefault = defaultFolderSelect.value;
  defaultFolderSelect.innerHTML = '<option value="">Select default folder...</option>' +
    folders.map(folder => `<option value="${folder}"${folder === currentDefault ? ' selected' : ''}>${folder}</option>`).join('');
}

// Update folder display in header
function updateFolderDisplay() {
  folderName.textContent = currentFolder || 'Select Folder';
}

// Load prompts from current folder
async function loadPrompts() {
  if (!currentFolder) {
    prompts = [];
  } else {
    prompts = await window.api.readPrompts(currentFolder);
  }
  focusedIndex = -1;
  renderPromptList();
}

// Render prompt list
function renderPromptList() {
  const hasDirectory = directoryInput.value.trim() !== '';
  
  if (!hasDirectory) {
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
  
  promptList.innerHTML = prompts.map((prompt, index) => `
    <div class="prompt-item${index === focusedIndex ? ' focused' : ''}" data-index="${index}" data-path="${prompt.path}">
      <div class="prompt-content">
        <div class="prompt-title">${escapeHtml(prompt.title)}</div>
        <div class="prompt-meta">${escapeHtml(prompt.name)}</div>
        <div class="prompt-preview">${escapeHtml(prompt.preview)}</div>
      </div>
      <button class="copy-btn" data-copy-index="${index}" title="Copy content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

// Update focus display without full re-render
function updateFocus() {
  const items = promptList.querySelectorAll('.prompt-item');
  items.forEach((item, index) => {
    item.classList.toggle('focused', index === focusedIndex);
  });
  
  // Scroll focused item into view
  if (focusedIndex >= 0 && items[focusedIndex]) {
    items[focusedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show detail view
async function showDetail(filePath, fileName) {
  const content = await window.api.readFile(filePath);
  if (content === null) return;
  
  currentFile = { path: filePath, name: fileName, content };
  detailFilename.textContent = fileName;
  detailContent.textContent = content;
  
  listContainer.classList.add('hidden');
  detailContainer.classList.remove('hidden');
}

// Hide detail view
function hideDetail() {
  currentFile = null;
  listContainer.classList.remove('hidden');
  detailContainer.classList.add('hidden');
}

// Copy content to clipboard
async function copyContent(content, button) {
  try {
    await window.api.copyToClipboard(content);
    
    // Visual feedback
    if (button) {
      button.classList.add('copied');
      const originalSvg = button.innerHTML;
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      `;
      
      setTimeout(() => {
        button.classList.remove('copied');
        button.innerHTML = originalSvg;
      }, 1500);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Copy focused prompt
async function copyFocusedPrompt() {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  
  const prompt = prompts[focusedIndex];
  const content = await window.api.readFile(prompt.path);
  if (content) {
    const copyBtn = promptList.querySelector(`[data-copy-index="${focusedIndex}"]`);
    await copyContent(content, copyBtn);
  }
}

// Open focused prompt
async function openFocusedPrompt() {
  if (focusedIndex < 0 || focusedIndex >= prompts.length) return;
  
  const prompt = prompts[focusedIndex];
  await showDetail(prompt.path, prompt.name);
}

// Switch to folder by index (0-8 for keys 1-9)
async function switchToFolder(index) {
  if (index < 0 || index >= folders.length) return;
  
  currentFolder = folders[index];
  updateFolderDisplay();
  renderFolderDropdown();
  await loadPrompts();
  closeFolderDropdown();
}

// Toggle folder dropdown
function toggleFolderDropdown() {
  folderDropdown.classList.toggle('hidden');
}

// Close folder dropdown
function closeFolderDropdown() {
  folderDropdown.classList.add('hidden');
}

// Open settings modal
async function openSettings() {
  // Load current default folder
  const defaultFolder = await window.api.getDefaultFolder();
  defaultFolderSelect.value = defaultFolder || '';
  settingsModal.classList.remove('hidden');
}

// Close settings modal
function closeSettings() {
  settingsModal.classList.add('hidden');
}

// Create new prompt
async function createNewPrompt() {
  if (!currentFolder) {
    openSettings();
    return;
  }
  
  const filename = prompt('Enter prompt filename (without .md):');
  if (!filename) return;
  
  // Convert to kebab-case and add .md
  const sanitized = filename.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.md';
  
  const result = await window.api.createPrompt(currentFolder, sanitized);
  if (result.success) {
    await loadPrompts();
    // Open the new file
    const newPrompt = prompts.find(p => p.path === result.path);
    if (newPrompt) {
      await showDetail(result.path, newPrompt.name);
    }
  } else {
    alert(result.error || 'Failed to create prompt');
  }
}

// Browse for directory
async function browseDirectory() {
  const dir = await window.api.pickDirectory();
  if (dir) {
    directoryInput.value = dir;
    await loadFolders();
    if (folders.length > 0) {
      currentFolder = folders[0];
      updateFolderDisplay();
    }
    await loadPrompts();
  }
}

// Event Listeners

// Folder button
folderBtn.addEventListener('click', toggleFolderDropdown);

// Folder dropdown click
folderDropdown.addEventListener('click', async (e) => {
  const option = e.target.closest('.folder-option');
  if (option) {
    const folder = option.dataset.folder;
    currentFolder = folder;
    updateFolderDisplay();
    renderFolderDropdown();
    await loadPrompts();
    closeFolderDropdown();
  }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.folder-selector')) {
    closeFolderDropdown();
  }
});

// Prompt list click handling
promptList.addEventListener('click', async (e) => {
  // Check if copy button was clicked
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    e.stopPropagation();
    const index = parseInt(copyBtn.dataset.copyIndex);
    const prompt = prompts[index];
    const content = await window.api.readFile(prompt.path);
    if (content) {
      await copyContent(content, copyBtn);
    }
    return;
  }
  
  // Check if prompt item was clicked
  const promptItem = e.target.closest('.prompt-item');
  if (promptItem) {
    const path = promptItem.dataset.path;
    const index = parseInt(promptItem.dataset.index);
    focusedIndex = index;
    const prompt = prompts[index];
    await showDetail(path, prompt.name);
  }
});

// Back button
backBtn.addEventListener('click', hideDetail);

// Detail copy button
detailCopyBtn.addEventListener('click', async () => {
  if (currentFile) {
    await copyContent(currentFile.content, detailCopyBtn);
  }
});

// New prompt button
newPromptBtn.addEventListener('click', createNewPrompt);

// Refresh button
refreshBtn.addEventListener('click', loadPrompts);

// Settings button
settingsBtn.addEventListener('click', openSettings);

// Close settings button
closeSettingsBtn.addEventListener('click', closeSettings);

// Close modal on overlay click
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

// Browse button
browseBtn.addEventListener('click', browseDirectory);

// Default folder select change
defaultFolderSelect.addEventListener('change', async () => {
  await window.api.setDefaultFolder(defaultFolderSelect.value);
});

// Empty state setup button
emptySetupBtn.addEventListener('click', browseDirectory);

// Keyboard shortcuts
document.addEventListener('keydown', async (e) => {
  // Don't handle shortcuts if in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // Escape to close modal, dropdown, or go back
  if (e.key === 'Escape') {
    if (!settingsModal.classList.contains('hidden')) {
      closeSettings();
    } else if (!folderDropdown.classList.contains('hidden')) {
      closeFolderDropdown();
    } else if (!detailContainer.classList.contains('hidden')) {
      hideDetail();
    }
    return;
  }
  
  // Cmd+, to open settings
  if (e.key === ',' && e.metaKey) {
    e.preventDefault();
    openSettings();
    return;
  }
  
  // Cmd+R to refresh
  if (e.key === 'r' && e.metaKey) {
    e.preventDefault();
    await loadPrompts();
    return;
  }
  
  // Cmd+N to create new prompt
  if (e.key === 'n' && e.metaKey) {
    e.preventDefault();
    createNewPrompt();
    return;
  }
  
  // Only handle these in list view
  if (detailContainer.classList.contains('hidden')) {
    // Number keys 1-9 to switch folders
    if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const folderIndex = parseInt(e.key) - 1;
      await switchToFolder(folderIndex);
      return;
    }
    
    // Tab to navigate through files
    if (e.key === 'Tab') {
      e.preventDefault();
      if (prompts.length === 0) return;
      
      if (e.shiftKey) {
        // Shift+Tab to go backwards
        focusedIndex = focusedIndex <= 0 ? prompts.length - 1 : focusedIndex - 1;
      } else {
        // Tab to go forwards
        focusedIndex = focusedIndex >= prompts.length - 1 ? 0 : focusedIndex + 1;
      }
      updateFocus();
      return;
    }
    
    // Enter to open focused prompt
    if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      await openFocusedPrompt();
      return;
    }
    
    // Cmd+C to copy focused prompt
    if (e.key === 'c' && e.metaKey && focusedIndex >= 0) {
      e.preventDefault();
      await copyFocusedPrompt();
      return;
    }
  }
});

// Add hidden class to list container for toggle
listContainer.classList.remove('hidden');

// Initialize
init();
