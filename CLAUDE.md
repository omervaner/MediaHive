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

## Completed Work

See `docs/CHANGELOG.md` for detailed history.

- ✅ **Phase 2: Image Support** - Display images alongside videos with filter toggle
- ✅ **Phase 2.5 Step 1: Resolution/AR Filter** - Filter by resolution presets and aspect ratio
- ✅ **Phase 2.5 Step 2: Screenshot Detector** - Auto-detect screenshots with filter toggle
- ✅ **Phase 2.5 Step 3: Dataset Export** - Export images to LoRA training-ready folder structure

---

## Current Work: Phase 3 - AI Captioning 🔄 IN PROGRESS

**📄 Full spec: `docs/PHASE3-AI-CAPTIONING.md`**

**Goal:** Add AI-powered image captioning using Ollama + Qwen3-VL (local, private).

### Implementation Steps

| Step | Description | Status | Files |
|------|-------------|--------|-------|
| 1 | Ollama detection & setup dialog | ✅ Done | `main/ollamaService.js`, `OllamaSetupDialog.jsx` |
| 2 | Model download with progress | ✅ Done | Same + progress UI |
| 3 | Caption service (single image) | ✅ Done | `main/captionService.js`, `MetadataPanel.jsx` |
| 4 | Batch captioning UI | ✅ Done | `BatchCaptionDialog.jsx`, `HeaderBar.jsx` |
| 5 | Caption display & editing | ✅ Done | Details panel, `SettingsDialog.jsx` |
| 6 | Export integration | Pending | Connect captions to Dataset Export |

### Model Options (4 tiers)

| Tier | Model | Size | RAM |
|------|-------|------|-----|
| Very Fast | `qwen3-vl:2b` | ~1.9 GB | 4GB+ |
| Fast | `qwen3-vl:4b` | ~3.3 GB | 8GB+ |
| Recommended | `qwen3-vl:8b` | ~6.1 GB | 16GB+ |
| Maximum | `qwen3-vl:32b` | ~20 GB | 32GB+ |

### Completed Features
- Ollama detection with "Download Ollama" link
- 4-tier model picker with download progress
- Single image captioning with cancel button
- Elapsed timer during generation
- 3-minute timeout warning
- Batch captioning with progress UI and auto-save tags
- Settings dialog with model management (view/delete models)

### Recent Bug Fixes (2026-01-01)
- Fixed batch caption not updating React state (typo: `setRawVideos` → `setVideos` in App.jsx)
- Fixed skip logic to check `tags` (current state) instead of `aiTags` (historical)
- Added "Clear All" button in Tags section to remove all tags from selected files
- Rebranded color scheme: green (#51cf66) → amber (#F59E0B) throughout the app

---

## On Hold

### Phase 2.5 Step 4: Duplicate Finder ⏸️
Perceptual hashing (pHash) to find visually similar images. Needs DCT implementation.

### Phase 2.5 Step 5: Quality Scorer ⏸️
Blur detection, exposure analysis, noise detection. Most complex, lowest priority.

---

## Dependencies

**Installed:**
- `sharp` - Image processing (dimensions, resize, EXIF)

**May need later:**
- None currently planned

Ask before adding any new dependencies.
