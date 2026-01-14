import { contextBridge, ipcRenderer } from 'electron';

export interface MarkdownFile {
  name: string;
  title: string;
  path: string;
  preview: string;
  mtime: number;
}

export interface Directory {
  name: string;
  markdownPath: string;
  projectPath?: string;
}

export interface KeyMappings {
  [key: string]: string;
}

export interface CreateFileResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface BarnBenchAPI {
  getDirectories: () => Promise<Directory[]>;
  addDirectory: (dir: Directory) => Promise<boolean>;
  removeDirectory: (name: string) => Promise<boolean>;
  updateDirectory: (name: string, dir: Directory) => Promise<boolean>;
  getDefaultDirectory: () => Promise<string>;
  setDefaultDirectory: (name: string) => Promise<string>;
  getKeyMappings: () => Promise<KeyMappings>;
  setKeyMappings: (mappings: KeyMappings) => Promise<KeyMappings>;
  pickDirectory: () => Promise<string | null>;
  readDirectory: (dirPath: string) => Promise<MarkdownFile[]>;
  readFile: (path: string) => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<boolean>;
  createFile: (dirPath: string, filename: string) => Promise<CreateFileResult>;
  copyToClipboard: (text: string) => Promise<void>;
  renderMarkdown: (content: string) => Promise<string>;
  openInCursor: (projectPath: string) => Promise<boolean>;
}

contextBridge.exposeInMainWorld('api', {
  getDirectories: () => ipcRenderer.invoke('get-directories'),
  addDirectory: (dir: Directory) => ipcRenderer.invoke('add-directory', dir),
  removeDirectory: (name: string) => ipcRenderer.invoke('remove-directory', name),
  updateDirectory: (name: string, dir: Directory) => ipcRenderer.invoke('update-directory', name, dir),
  getDefaultDirectory: () => ipcRenderer.invoke('get-default-directory'),
  setDefaultDirectory: (name: string) => ipcRenderer.invoke('set-default-directory', name),
  getKeyMappings: () => ipcRenderer.invoke('get-key-mappings'),
  setKeyMappings: (mappings: KeyMappings) => ipcRenderer.invoke('set-key-mappings', mappings),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('write-file', path, content),
  createFile: (dirPath: string, filename: string) => ipcRenderer.invoke('create-file', dirPath, filename),
  copyToClipboard: (text: string) => navigator.clipboard.writeText(text),
  renderMarkdown: (content: string) => ipcRenderer.invoke('render-markdown', content),
  openInCursor: (projectPath: string) => ipcRenderer.invoke('open-in-cursor', projectPath)
} as BarnBenchAPI);
