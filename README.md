# BarnBench

A minimal macOS desktop app for browsing and managing AI prompts stored as markdown files.

## Features

- Browse markdown files from a configurable directory
- View file previews (filename + first few lines)
- Click to view full raw markdown content
- Copy entire file content with one click
- Files sorted by last modified date
- Dark theme UI inspired by Cursor/Notion

## Usage

1. Run the app: `npm start`
2. Click the gear icon to open Settings
3. Choose your prompts directory
4. Browse and manage your prompts

## Keyboard Shortcuts

- `Cmd + ,` — Open settings
- `Escape` — Close modal or go back to list

## Development

```bash
# Install dependencies
npm install

# Run the app
npm start
```

## Structure

```
barnbench/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── renderer/
│   ├── index.html   # Main window
│   ├── styles.css   # Dark theme
│   └── app.js       # UI logic
└── package.json
```
