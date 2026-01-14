import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

interface PromptFile {
  name: string;
  title: string;
  path: string;
  preview: string;
  mtime: number;
}

interface Frontmatter {
  body: string;
  title?: string;
  [key: string]: string | string[] | undefined;
}

interface KeyMappings {
  [key: string]: string;
}

interface FolderMetadata {
  projectPath?: string;
}

const store = new Store();
let mainWindow: BrowserWindow | null = null;

function getRootDir(): string {
  return store.get('promptsDirectory', '') as string;
}

function parseFrontmatter(content: string): Frontmatter {
  const result: Frontmatter = { body: content };
  if (!content.startsWith('---')) return result;
  
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return result;
  
  const frontmatterStr = content.substring(3, endIndex).trim();
  result.body = content.substring(endIndex + 3).trim();
  
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value: string | string[] = line.substring(colonIndex + 1).trim();
    
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim());
    }
    result[key] = value;
  }
  return result;
}

function createWindow(): void {
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
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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

ipcMain.handle('get-directory', (): string => store.get('promptsDirectory', '') as string);
ipcMain.handle('get-default-folder', (): string => store.get('defaultFolder', '') as string);
ipcMain.handle('set-default-folder', (_: IpcMainInvokeEvent, folder: string): string => { store.set('defaultFolder', folder); return folder; });
ipcMain.handle('get-key-mappings', (): KeyMappings => store.get('keyMappings', {}) as KeyMappings);
ipcMain.handle('set-key-mappings', (_: IpcMainInvokeEvent, mappings: KeyMappings): KeyMappings => { store.set('keyMappings', mappings); return mappings; });

ipcMain.handle('pick-directory', async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    store.set('promptsDirectory', result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('list-folders', (): string[] => {
  const rootDir = getRootDir();
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  
  try {
    return fs.readdirSync(rootDir)
      .filter(name => {
        const fullPath = path.join(rootDir, name);
        return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
      })
      .slice(0, 9);
  } catch {
    return [];
  }
});

ipcMain.handle('read-prompts', (_: IpcMainInvokeEvent, folderName: string): PromptFile[] => {
  const rootDir = getRootDir();
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
          title: (frontmatter.title as string) || file.replace('.md', ''),
          path: filePath,
          preview: lines.slice(0, 2).join('\n').substring(0, 200),
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
});

ipcMain.handle('create-prompt', (_: IpcMainInvokeEvent, folderName: string, filename: string): { success: boolean; path?: string; error?: string } => {
  const rootDir = getRootDir();
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
    return { success: false, error: (e as Error).message };
  }
});

ipcMain.handle('read-file', (_: IpcMainInvokeEvent, filePath: string): string | null => {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  } catch {
    return null;
  }
});

ipcMain.handle('write-file', (_: IpcMainInvokeEvent, filePath: string, content: string): boolean => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('get-folder-metadata', (_: IpcMainInvokeEvent, folderName: string): FolderMetadata => {
  const allMetadata = store.get('folderMetadata', {}) as Record<string, FolderMetadata>;
  return allMetadata[folderName] || {};
});

ipcMain.handle('set-folder-metadata', (_: IpcMainInvokeEvent, folderName: string, metadata: FolderMetadata): boolean => {
  const allMetadata = store.get('folderMetadata', {}) as Record<string, FolderMetadata>;
  allMetadata[folderName] = metadata;
  store.set('folderMetadata', allMetadata);
  return true;
});

ipcMain.handle('open-in-cursor', (_: IpcMainInvokeEvent, projectPath: string): boolean => {
  try {
    const { spawn } = require('child_process');
    spawn('cursor', [projectPath], { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch {
    return false;
  }
});
