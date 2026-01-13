const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Directory operations
  getDirectory: () => ipcRenderer.invoke('get-directory'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  
  // Folder operations
  listFolders: () => ipcRenderer.invoke('list-folders'),
  getDefaultFolder: () => ipcRenderer.invoke('get-default-folder'),
  setDefaultFolder: (folderName) => ipcRenderer.invoke('set-default-folder', folderName),
  getKeyMappings: () => ipcRenderer.invoke('get-key-mappings'),
  setKeyMappings: (mappings) => ipcRenderer.invoke('set-key-mappings', mappings),
  
  // File operations
  readPrompts: (folderName) => ipcRenderer.invoke('read-prompts', folderName),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  createPrompt: (folderName, filename) => ipcRenderer.invoke('create-prompt', folderName, filename),
  
  // Clipboard
  copyToClipboard: (text) => navigator.clipboard.writeText(text)
});
