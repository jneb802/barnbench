const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

let mainWindow;

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
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const preview = lines.slice(0, 3).join('\n').substring(0, 200);
        
        return {
          name: file,
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
