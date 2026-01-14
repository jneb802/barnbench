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

interface KeyMappings {
  [key: string]: string;
}

interface CreateFileResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface BarnBenchAPI {
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

interface Window {
  api: BarnBenchAPI;
}
