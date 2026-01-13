const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

function parseFrontmatter(content) {
  const result = { body: content };
  if (!content.startsWith('---')) return result;
  
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return result;
  
  const frontmatterStr = content.substring(3, endIndex).trim();
  result.body = content.substring(endIndex + 3).trim();
  
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim());
    }
    result[key] = value;
  }
  return result;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


// IPC Handlers

ipcMain.handle('get-directory', () => store.get('promptsDirectory', ''));
ipcMain.handle('get-default-folder', () => store.get('defaultFolder', ''));
ipcMain.handle('set-default-folder', (_, folder) => { store.set('defaultFolder', folder); return folder; });
ipcMain.handle('get-key-mappings', () => store.get('keyMappings', {}));
ipcMain.handle('set-key-mappings', (_, mappings) => { store.set('keyMappings', mappings); return mappings; });

ipcMain.handle('pick-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('promptsDirectory', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('list-folders', () => {
  const rootDir = store.get('promptsDirectory', '');
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  
  try {
    return fs.readdirSync(rootDir)
      .filter(name => {
        const fullPath = path.join(rootDir, name);
        return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
      })
      .slice(0, 9);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('read-prompts', (_, folderName) => {
  const rootDir = store.get('promptsDirectory', '');
  if (!rootDir || !folderName) return [];
  
  const dirPath = path.join(rootDir, folderName);
  if (!fs.existsSync(dirPath)) return [];

  try {
    return fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.md') && file.toLowerCase() !== 'readme.md')
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatter = parseFrontmatter(content);
        const lines = frontmatter.body.split('\n').filter(l => l.trim());
        
        return {
          name: file,
          title: frontmatter.title || file.replace('.md', ''),
          path: filePath,
          preview: lines.slice(0, 2).join('\n').substring(0, 200),
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch (e) {
    return [];
  }
});

ipcMain.handle('create-prompt', (_, folderName, filename) => {
  const rootDir = store.get('promptsDirectory', '');
  if (!rootDir || !folderName) return { success: false, error: 'No directory configured' };
  
  const filePath = path.join(rootDir, folderName, filename);
  if (fs.existsSync(filePath)) return { success: false, error: 'File already exists' };
  
  const today = new Date().toISOString().split('T')[0];
  const title = filename.replace('.md', '').replace(/-/g, ' ');
  const template = `---
title: ${title}
tags: []
created: ${today}
---

# ${title}

`;
  
  try {
    fs.writeFileSync(filePath, template, 'utf-8');
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('read-file', (_, filePath) => {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  } catch (e) {
    return null;
  }
});
