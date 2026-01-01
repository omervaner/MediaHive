# CLAUDE.md - MediaHive Working Document

## Coding Conventions

**ALWAYS follow these rules:**

1. **Back-trace before changing** - Understand the call chain before modifying anything. Grep for usages.
2. **Keep logic out of main.js** - main.js is the orchestrator. Business logic goes in `/main/*.js` modules.
3. **No unnecessary refactors** - Change only what's needed. Don't rename things "for consistency" unless asked.
4. **One thing at a time** - Complete and test each step before moving to the next.
5. **Preserve existing patterns** - Match the code style already in use (naming, spacing, error handling).
6. **New files for new features** - Don't bloat existing files. Create new modules.
7. **No new dependencies without asking** - Use Node/Electron built-ins when possible.
8. **Test after each change** - Run `npm run electron:dev` to verify nothing broke.

## Commands

```bash
npm run electron:dev   # Development (Vite + Electron, hot reload)
npm run start          # Production mode
npm test               # Run tests
```

---

## Current Version: 0.7.0

See `docs/CHANGELOG.md` for detailed history of completed features.

---

## Completed Work: Phase 4 QOL Features ✅

### Rubber Band Selection ✅ COMPLETE
- Click and drag on empty grid space to draw selection rectangle
- Shift+drag adds to existing selection
- Ctrl/Cmd+drag toggles items
- Amber-themed semi-transparent rectangle
- Works with scroll position and all zoom levels

**Files created:**
- `src/hooks/selection/useRubberBandSelection.js`

**Files modified:**
- `src/App.jsx` - Hook integration, mousedown handler, rectangle overlay
- `src/App.css` - Rubber band styles

### Copy/Move with Rename ✅ COMPLETE
- Right-click context menu: "Copy to..." and "Move to..."
- Destination folder picker
- Rename options: keep original, prefix+sequence, find/replace
- Preview renamed files before executing
- Progress bar during operation
- Auto-generates unique names if file exists
- Moved files automatically removed from view

**Files created:**
- `src/components/MoveDialog.jsx` - Copy/Move dialog with rename options
- `main/fileOperations.js` - Backend copy/move with rename logic

**Files modified:**
- `src/components/ContextMenu.jsx` - Added Copy to.../Move to... menu items
- `main.js` - IPC handlers for file operations
- `preload.js` - fileOps bridge (pickFolder, copyMove, onProgress)
- `src/App.jsx` - MoveDialog integration, context action handling

---

## On Hold

### Phase 2.5 Step 4: Duplicate Finder ⏸️
Perceptual hashing (pHash) to find visually similar images. Needs DCT implementation.

### Phase 2.5 Step 5: Quality Scorer ⏸️
Blur detection, exposure analysis, noise detection. Most complex, lowest priority.

---

## Project Structure

```
MediaHive/
├── main.js              # Electron main process orchestrator
├── preload.js           # IPC bridge
├── main/                # Backend modules
│   ├── ollamaService.js    # Ollama API
│   ├── captionService.js   # AI caption generation
│   ├── datasetExporter.js  # Export functionality
│   ├── fileOperations.js   # Copy/move with rename
│   ├── database.js         # SQLite metadata store
│   └── ...
├── src/                 # React frontend
│   ├── App.jsx             # Main app component
│   ├── App.css             # Global styles (amber theme)
│   ├── components/         # UI components
│   │   ├── MoveDialog.jsx     # Copy/Move dialog
│   │   └── ...
│   └── hooks/              # React hooks
│       └── selection/
│           ├── useSelectionState.js
│           └── useRubberBandSelection.js
├── assets/icons/        # App icons (mediahive.png/ico)
└── docs/                # Documentation
    ├── CHANGELOG.md        # Version history
    └── PHASE3-AI-CAPTIONING.md
```

## Color Palette (Amber Theme)

- Main accent: `#F59E0B` (amber-500)
- Hover/dark: `#D97706` (amber-600)
- Light/success: `#FBBF24` (amber-400)
- Text on amber: `#422006` (dark brown)
- CSS variable: `--color-accent`

---

## Dependencies

**Installed:**
- `sharp` - Image processing (dimensions, resize, EXIF)
- `better-sqlite3` - Metadata database

**May need later:**
- None currently planned

Ask before adding any new dependencies.
