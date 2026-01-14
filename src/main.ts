import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

interface MarkdownFile {
  name: string;
  title: string;
  path: string;
  preview: string;
  mtime: number;
}

interface Directory {
  name: string;
  markdownPath: string;
  projectPath?: string;
}

interface Frontmatter {
  body: string;
  title?: string;
  [key: string]: string | string[] | undefined;
}

interface KeyMappings {
  [key: string]: string;
}

const store = new Store();
let mainWindow: BrowserWindow | null = null;

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight: (str: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {}
    }
    return '';
  }
});

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

ipcMain.handle('get-directories', (): Directory[] => {
  return store.get('directories', []) as Directory[];
});

ipcMain.handle('add-directory', (_: IpcMainInvokeEvent, dir: Directory): boolean => {
  const dirs = store.get('directories', []) as Directory[];
  dirs.push(dir);
  store.set('directories', dirs);
  return true;
});

ipcMain.handle('remove-directory', (_: IpcMainInvokeEvent, name: string): boolean => {
  const dirs = (store.get('directories', []) as Directory[]).filter(d => d.name !== name);
  store.set('directories', dirs);
  return true;
});

ipcMain.handle('update-directory', (_: IpcMainInvokeEvent, oldName: string, dir: Directory): boolean => {
  const dirs = store.get('directories', []) as Directory[];
  const index = dirs.findIndex(d => d.name === oldName);
  if (index >= 0) dirs[index] = dir;
  store.set('directories', dirs);
  return true;
});

ipcMain.handle('get-default-directory', (): string => {
  return store.get('defaultDirectory', '') as string;
});

ipcMain.handle('set-default-directory', (_: IpcMainInvokeEvent, name: string): string => {
  store.set('defaultDirectory', name);
  return name;
});

ipcMain.handle('get-key-mappings', (): KeyMappings => {
  return store.get('keyMappings', {}) as KeyMappings;
});

ipcMain.handle('set-key-mappings', (_: IpcMainInvokeEvent, mappings: KeyMappings): KeyMappings => {
  store.set('keyMappings', mappings);
  return mappings;
});

ipcMain.handle('pick-directory', async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-directory', (_: IpcMainInvokeEvent, dirPath: string): MarkdownFile[] => {
  if (!dirPath || !fs.existsSync(dirPath)) return [];

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

ipcMain.handle('create-file', (_: IpcMainInvokeEvent, dirPath: string, filename: string): { success: boolean; path?: string; error?: string } => {
  if (!dirPath) return { success: false, error: 'No directory specified' };
  
  const filePath = path.join(dirPath, filename);
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

ipcMain.handle('render-markdown', (_: IpcMainInvokeEvent, content: string): string => {
  return md.render(content);
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
