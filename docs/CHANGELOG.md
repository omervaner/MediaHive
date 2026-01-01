# MediaHive Changelog

## Completed Features

---

### v0.7.0 - Phase 4: QOL Features ✅ COMPLETE (2026-01-01)

Quality of life improvements for file management and selection.

**Rubber Band Selection:**
- Click and drag on empty grid space to draw selection rectangle
- Shift+drag adds to existing selection
- Ctrl/Cmd+drag toggles items (select if unselected, deselect if selected)
- Amber-themed semi-transparent rectangle with border
- Works with scroll position and all zoom levels
- Performance optimized for 1000+ items

**Copy/Move with Rename:**
- Right-click context menu: "Copy to..." and "Move to..."
- Destination folder picker dialog
- Three rename modes:
  - Keep original names
  - Prefix + sequence (e.g., photo_001.jpg, photo_002.jpg)
  - Find and replace text in filenames
- Live preview of renamed files before execution
- Progress bar during file operations
- Auto-generates unique names if destination file exists
- Moved files automatically removed from grid view

**Files created:**
- `src/hooks/selection/useRubberBandSelection.js` - Rubber band selection hook
- `src/components/MoveDialog.jsx` - Copy/Move dialog with rename options
- `main/fileOperations.js` - Backend copy/move with rename logic

**Files modified:**
- `src/components/ContextMenu.jsx` - Added Copy to.../Move to... menu items
- `src/App.jsx` - Hook integration, dialog state, context action handling
- `src/App.css` - Rubber band selection styles
- `main.js` - IPC handlers for file operations
- `preload.js` - fileOps bridge (pickFolder, copyMove, onProgress)

---

### v0.7.0 - Phase 3: AI Captioning ✅ COMPLETE (2026-01-01)

Local AI-powered image captioning using Ollama + Qwen3-VL.

**What was implemented:**
- Ollama detection with "Download Ollama" link for first-time setup
- 4-tier model picker (2B, 4B, 8B, 32B) with size/RAM requirements
- Model download progress with streaming status
- Single image captioning with cancel button and elapsed timer
- Batch captioning with progress UI, skip existing, auto-save to database
- Caption display in MetadataPanel with copy/regenerate buttons
- AI tags displayed as suggestions, saveable to file tags
- Settings dialog with model management (view, switch, delete models)
- Export integration: choose AI captions or tags for .txt files
- 3-minute timeout warning, 5-minute hard timeout

**Branding & UI updates:**
- Rebranded from green (#51cf66) to amber (#F59E0B) color scheme
- New MediaHive honeycomb icon
- Added macOS title bar with drag region for traffic light spacing
- Fixed welcome text (green → amber folder reference)

**Bug fixes:**
- Fixed batch caption React state update (setRawVideos → setVideos)
- Fixed skip logic to check current tags instead of aiTags
- Added "Clear All" button for tags

**Files created:**
- `main/ollamaService.js` - Ollama API integration
- `main/captionService.js` - Caption/tag generation with timeouts
- `src/components/OllamaSetupDialog.jsx` - Setup wizard
- `src/components/BatchCaptionDialog.jsx` - Batch processing UI
- `src/components/SettingsDialog.jsx` - Model management
- `src/components/TitleBar.jsx` - macOS drag region

**Files modified:**
- `main/datasetExporter.js` - AI caption support in export
- `src/components/ExportDialog.jsx` - Caption source selector
- `src/components/MetadataPanel.jsx` - Caption display/edit
- `src/components/HeaderBar.jsx` - Caption button
- `src/App.css` - Amber color scheme
- `main.js` - IPC handlers, app name fix

---

### Phase 2.5 Step 3: Dataset Export ✅ COMPLETE (2025-01-01)

Export filtered images to LoRA training-ready folder structure.

**What was implemented:**
- Export dialog with destination picker
- Options: include captions, resize images, rename sequentially
- Copy or move file handling
- Progress bar during export

**Files created/modified:**
- `main/datasetExporter.js` (NEW)
- `src/components/ExportDialog.jsx` (NEW)
- `main.js` - IPC handlers for export

---

### Phase 2.5 Step 2: Screenshot Detector ✅ COMPLETE (2025-01-01)

Automatically identify screenshots without AI.

**What was implemented:**
- Filename pattern detection (Screenshot*, IMG_*, etc.)
- Known screen resolution matching (iPhone, Android, desktop)
- Extreme aspect ratio detection (< 0.5 or > 2.0)
- Confidence scoring system
- Filter toggle: All / Hide Screenshots / Only Screenshots

**Files created/modified:**
- `main/screenshotDetector.js` (NEW)
- `src/components/FiltersPopover.jsx` - Screenshot filter UI

---

### Phase 2.5 Step 1: Resolution & Aspect Ratio Filter ✅ COMPLETE (2025-01-01)

Filter media by resolution ranges and aspect ratio categories.

**What was implemented:**
- Resolution presets: All, 512+, 768+, 1024+, 2K+, 4K+
- Aspect ratio categories: All, Square (0.9-1.1), Portrait (<0.9), Landscape (>1.1)
- UI in FiltersPopover with button groups
- EXIF orientation fix for iPhone photos

**Files modified:**
- `src/app/filters/filtersUtils.js` - Filter logic and presets
- `src/app/hooks/useFilterState.js` - Filter application
- `src/components/FiltersPopover.jsx` - Filter UI

---

### Phase 2: Image Support ✅ COMPLETE (2025-01-01)

Extended MediaHive to display images alongside videos with a filter toggle.

**What was implemented:**
- Backend extension detection with `IMAGE_EXTENSIONS` and `VIDEO_EXTENSIONS` constants
- `mediaType` field on file objects ('image' | 'video')
- Image dimension extraction using `sharp` with EXIF orientation support
- `ImageElement.jsx` component for rendering images in grid
- `FullScreenModal` support for both images and videos
- Media filter toggle in HeaderBar: [Images] [Videos] [All]

**Files created/modified:**
- `main/imageDimensions.js` (NEW)
- `src/components/VideoCard/ImageElement.jsx` (NEW)
- Multiple existing files modified

**Dependencies added:** `sharp`

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2026-01-01 | 0.7.0 | Phase 3 + 4 complete (AI Captioning, QOL features), amber rebrand |
| 2025-01-01 | 0.3.0 | Phase 2.5 complete (Dataset Export) |
| 2025-01-01 | 0.2.0 | Phase 2 complete, Phase 2.5 Steps 1-2 complete |
| Pre-fork | 0.1.0 | VideoSwarm base (video-only) |
