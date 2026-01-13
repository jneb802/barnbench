interface PromptFile {
  name: string;
  title: string;
  path: string;
  preview: string;
  mtime: number;
}

interface KeyMappings {
  [key: string]: string;
}

interface CreatePromptResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface BarnBenchAPI {
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

interface Window {
  api: BarnBenchAPI;
}
