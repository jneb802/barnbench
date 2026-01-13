const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

let mainWindow;

// Parse YAML frontmatter from markdown content
function parseFrontmatter(content) {
  const result = { body: content };
  
  if (!content.startsWith('---')) {
    return result;
  }
  
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return result;
  }
  
  const frontmatterStr = content.substring(3, endIndex).trim();
  result.body = content.substring(endIndex + 3).trim();
  
  // Simple YAML parsing for our use case
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Parse arrays like [tag1, tag2]
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Get stored directory path
ipcMain.handle('get-directory', () => {
  return store.get('promptsDirectory', '');
});

// Set directory path
ipcMain.handle('set-directory', async (event, dirPath) => {
  store.set('promptsDirectory', dirPath);
  return dirPath;
});

// Open directory picker dialog
ipcMain.handle('pick-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const dirPath = result.filePaths[0];
    store.set('promptsDirectory', dirPath);
    return dirPath;
  }
  return null;
});

// Read all markdown files from directory, sorted by mtime
ipcMain.handle('read-prompts', async () => {
  const dirPath = store.get('promptsDirectory', '');
  
  if (!dirPath || !fs.existsSync(dirPath)) {
    return [];
  }

  try {
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.md') && file.toLowerCase() !== 'readme.md')
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Parse frontmatter
        const frontmatter = parseFrontmatter(content);
        const bodyContent = frontmatter.body;
        const lines = bodyContent.split('\n').filter(l => l.trim());
        const preview = lines.slice(0, 2).join('\n').substring(0, 200);
        
        return {
          name: file,
          title: frontmatter.title || file.replace('.md', ''),
          status: frontmatter.status || null,
          tags: frontmatter.tags || [],
          path: filePath,
          preview: preview,
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Sort by most recently modified

    return files;
  } catch (error) {
    console.error('Error reading prompts:', error);
    return [];
  }
});

// Create a new prompt file
ipcMain.handle('create-prompt', async (event, filename) => {
  const dirPath = store.get('promptsDirectory', '');
  
  if (!dirPath || !fs.existsSync(dirPath)) {
    return { success: false, error: 'No directory configured' };
  }
  
  const filePath = path.join(dirPath, filename);
  
  if (fs.existsSync(filePath)) {
    return { success: false, error: 'File already exists' };
  }
  
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
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Read full content of a specific file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return null;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});
