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

## Current Work: Settings Expansion ✅ COMPLETE

### Completed
- Clean menu-style Settings dialog with two navigation items
- **AI Captioning** sub-modal: Model config, endpoint editing, installed models management
- **About** sub-modal: App name, version, description, GitHub link, tech stack
- **Exit App** button (subtle, bottom-left)
- Sub-modals open on top of main Settings dialog
- Escape key handling respects modal stack

### Pending (Future Work)

#### Default Behaviors
Save user preferences that persist across sessions:
- Default sort order, group by folders, recursive loading
- Default media filter, show filenames, zoom level

#### Data Management
- Thumbnail cache size + clear button
- Metadata database size + clear button  
- Recent folders clear button

#### Keyboard Shortcuts
Reference panel showing all available hotkeys

---

## Completed Work

### Phase 4: QOL Features ✅ COMPLETE
- Rubber band selection (drag to select multiple)
- Copy/Move with rename (prefix+sequence, find/replace)

### Phase 3: AI Captioning ✅ COMPLETE
- Ollama integration, batch captioning, export integration

### Phase 2.5: Filters & Export ✅ COMPLETE
- Resolution/AR filters, screenshot detection, dataset export

### Phase 2: Image Support ✅ COMPLETE
- Images alongside videos, media type filter

---

## On Hold

### Phase 2.5 Step 4: Duplicate Finder ⏸️
Perceptual hashing (pHash) to find visually similar images.

### Phase 2.5 Step 5: Quality Scorer ⏸️
Blur detection, exposure analysis, noise detection.

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
│   │   ├── SettingsDialog.jsx  # Settings (expanding)
│   │   ├── MoveDialog.jsx      # Copy/Move dialog
│   │   └── ...
│   └── hooks/              # React hooks
├── assets/icons/        # App icons (mediahive.png/ico)
└── docs/                # Documentation
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
