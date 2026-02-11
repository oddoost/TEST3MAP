# Obsidian-like Canvas (Vite + React + TypeScript)

This is a minimal example project demonstrating a canvas-like app using React Flow, Zustand for state, Dexie for IndexedDB persistence, Tailwind CSS for styling, and react-markdown for markdown nodes.

Features:
- Pan/zoom and basic React Flow interactions
- Create Markdown and Image nodes
- Edit node content inline (markdown preview + textarea)
- Link nodes with edges
- Save/load to IndexedDB (auto-save via Save button)
- Export JSON

Getting started

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
npm run preview
```

Notes
- This is a compact example for learning and prototyping. You can extend the node data model, add richer linking metadata, search, syncing, etc.
