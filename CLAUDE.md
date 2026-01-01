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

## Current Work: Duplicate Finder ✅ COMPLETE

### Plan

**Backend (3 files):**

1. **`main/perceptualHash.js`** (new)
   - `computeDHash(imagePath)` - Uses sharp to resize to 9×8 grayscale, compare adjacent pixels, return 64-bit hex hash
   - `hammingDistance(hash1, hash2)` - Count differing bits
   - `findDuplicateGroups(hashes, threshold=5)` - Group files by similarity

2. **`main/database.js`** (modify)
   - Add `phash TEXT` column to files table
   - Store/retrieve hash during indexFile

3. **`main.js`** (add handlers)
   - `duplicates:find` - Takes fingerprints array, returns groups of duplicates
   - `duplicates:trash` - Takes array of file paths, moves all to trash

**Frontend (2 files):**

4. **`HeaderBar.jsx`** (modify)
   - Add "Find Duplicates" button (only enabled when folder loaded)

5. **`App.jsx`** (modify)
   - `duplicateMode` state (boolean)
   - `duplicateGroups` state (array of arrays)
   - When duplicate mode on: filter displayed files to only duplicates
   - Show "Remove All Duplicates" button + "Exit" button in header
   - Remove All: keeps first of each group, trashes rest, exits mode

**Flow:**
1. User clicks "Find Duplicates"
2. Backend computes/fetches hashes for current folder's files
3. Backend groups by Hamming distance ≤5
4. Frontend filters to show only duplicates
5. User reviews, clicks "Remove All Duplicates"
6. Confirmation dialog → trash all but first in each group
7. Return to normal view

### Progress
- [x] Step 1: perceptualHash.js module
- [x] Step 2: database.js phash column
- [x] Step 3: IPC handlers in main.js + preload.js
- [x] Step 4: HeaderBar button
- [x] Step 5: App.jsx duplicate mode

---

## Previous Work: Settings Expansion ✅ COMPLETE

### Completed
- Clean menu-style Settings dialog with four navigation items
- **AI Captioning** sub-modal: Model config, endpoint editing, installed models management
- **Data Management** sub-modal: Cache stats/clear, database stats/clear, recent folders clear, open data folder
- **Keyboard Shortcuts** sub-modal: Read-only reference grouped by category (Navigation, Selection, File Ops, Zoom)
- **About** sub-modal: App name, version, description, GitHub link, tech stack
- **Exit App** button (subtle, bottom-left)
- Sub-modals open on top of main Settings dialog
- Escape key handling respects modal stack
- Platform-aware modifier key display (⌘ on Mac, Ctrl on Windows/Linux)

### Pending (Future Work)

#### Default Behaviors ⏸️ ON HOLD
Save user preferences that persist across sessions:
- Default sort order, group by folders, recursive loading
- Default media filter, show filenames, zoom level

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
