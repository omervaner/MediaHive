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

## Current Work: QOL Features 🔄 IN PROGRESS

### Phase 4: Quality of Life Improvements

| Feature | Description | Status | Priority |
|---------|-------------|--------|----------|
| Rubber band selection | Drag to select multiple files | Pending | High |
| Batch rename | Prefix, sequence, find/replace | Pending | Medium |
| Quick move/copy | Right-click → "Move to..." / "Copy to..." | Pending | Medium |

### Rubber Band Selection (Next Up)

**Goal:** Click and drag on empty space to draw a selection rectangle. All files within the rectangle get selected.

**Requirements:**
- Only activates on mousedown on empty grid space (not on cards)
- Visual rectangle follows cursor during drag
- Shift+drag adds to existing selection
- Ctrl+drag toggles items (select if unselected, deselect if selected)
- Works with current zoom level and scroll position
- Performance: must handle 1000+ items smoothly

**Implementation approach:**
1. Add mousedown/mousemove/mouseup handlers to grid container
2. Track drag start position and current position
3. Render semi-transparent selection rectangle overlay
4. On drag end, compute which cards intersect the rectangle
5. Update selection state accordingly

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
│   ├── database.js         # SQLite metadata store
│   └── ...
├── src/                 # React frontend
│   ├── App.jsx             # Main app component
│   ├── App.css             # Global styles (amber theme)
│   ├── components/         # UI components
│   └── hooks/              # React hooks
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
