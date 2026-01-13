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
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const directoryInput = document.getElementById('directoryInput');
const browseBtn = document.getElementById('browseBtn');

// State
let prompts = [];
let currentFile = null;

// Initialize app
async function init() {
  await loadDirectory();
  await loadPrompts();
}

// Load directory from settings
async function loadDirectory() {
  const dir = await window.api.getDirectory();
  directoryInput.value = dir || '';
}

// Load prompts from directory
async function loadPrompts() {
  prompts = await window.api.readPrompts();
  renderPromptList();
}

// Render prompt list
function renderPromptList() {
  const hasDirectory = directoryInput.value.trim() !== '';
  
  if (!hasDirectory) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyState.querySelector('p').textContent = 'No prompts directory configured';
    return;
  }
  
  if (prompts.length === 0) {
    emptyState.style.display = 'flex';
    promptList.style.display = 'none';
    emptyState.querySelector('p').textContent = 'No markdown files found';
    emptyState.querySelector('button').style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  promptList.style.display = 'flex';
  
  promptList.innerHTML = prompts.map((prompt, index) => `
    <div class="prompt-item" data-index="${index}" data-path="${prompt.path}">
      <div class="prompt-content">
        <div class="prompt-name">${escapeHtml(prompt.name)}</div>
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
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Open settings modal
function openSettings() {
  settingsModal.classList.remove('hidden');
}

// Close settings modal
function closeSettings() {
  settingsModal.classList.add('hidden');
}

// Browse for directory
async function browseDirectory() {
  const dir = await window.api.pickDirectory();
  if (dir) {
    directoryInput.value = dir;
    await loadPrompts();
  }
}

// Event Listeners

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

// Empty state setup button
emptySetupBtn.addEventListener('click', browseDirectory);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape to close modal or go back
  if (e.key === 'Escape') {
    if (!settingsModal.classList.contains('hidden')) {
      closeSettings();
    } else if (!detailContainer.classList.contains('hidden')) {
      hideDetail();
    }
  }
  
  // Cmd+, to open settings
  if (e.key === ',' && e.metaKey) {
    e.preventDefault();
    openSettings();
  }
  
  // Cmd+R to refresh
  if (e.key === 'r' && e.metaKey) {
    e.preventDefault();
    loadPrompts();
  }
});

// Add hidden class to list container for toggle
listContainer.classList.remove('hidden');

// Initialize
init();
