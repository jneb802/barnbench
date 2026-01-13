const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Directory operations
  getDirectory: () => ipcRenderer.invoke('get-directory'),
  setDirectory: (dirPath) => ipcRenderer.invoke('set-directory', dirPath),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  
  // File operations
  readPrompts: () => ipcRenderer.invoke('read-prompts'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Clipboard
  copyToClipboard: (text) => navigator.clipboard.writeText(text)
});
