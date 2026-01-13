import { contextBridge, ipcRenderer } from 'electron';

export interface PromptFile {
  name: string;
  title: string;
  path: string;
  preview: string;
  mtime: number;
}

export interface KeyMappings {
  [key: string]: string;
}

export interface CreatePromptResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface BarnBenchAPI {
  getDirectory: () => Promise<string>;
  pickDirectory: () => Promise<string | null>;
  listFolders: () => Promise<string[]>;
  getDefaultFolder: () => Promise<string>;
  setDefaultFolder: (folder: string) => Promise<string>;
  getKeyMappings: () => Promise<KeyMappings>;
  setKeyMappings: (mappings: KeyMappings) => Promise<KeyMappings>;
  readPrompts: (folder: string) => Promise<PromptFile[]>;
  readFile: (path: string) => Promise<string | null>;
  createPrompt: (folder: string, filename: string) => Promise<CreatePromptResult>;
  copyToClipboard: (text: string) => Promise<void>;
}

contextBridge.exposeInMainWorld('api', {
  getDirectory: () => ipcRenderer.invoke('get-directory'),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  listFolders: () => ipcRenderer.invoke('list-folders'),
  getDefaultFolder: () => ipcRenderer.invoke('get-default-folder'),
  setDefaultFolder: (folder: string) => ipcRenderer.invoke('set-default-folder', folder),
  getKeyMappings: () => ipcRenderer.invoke('get-key-mappings'),
  setKeyMappings: (mappings: KeyMappings) => ipcRenderer.invoke('set-key-mappings', mappings),
  readPrompts: (folder: string) => ipcRenderer.invoke('read-prompts', folder),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  createPrompt: (folder: string, filename: string) => ipcRenderer.invoke('create-prompt', folder, filename),
  copyToClipboard: (text: string) => navigator.clipboard.writeText(text)
} as BarnBenchAPI);
