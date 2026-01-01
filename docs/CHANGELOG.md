# MediaHive Changelog

## Completed Features

---

### Phase 2: Image Support ✅ COMPLETE (2025-01-01)

Extended MediaHive to display images alongside videos with a filter toggle.

**What was implemented:**
- Backend extension detection with `IMAGE_EXTENSIONS` and `VIDEO_EXTENSIONS` constants
- `mediaType` field on file objects ('image' | 'video')
- Image dimension extraction using `sharp` with EXIF orientation support
- `ImageElement.jsx` component for rendering images in grid
- `FullScreenModal` support for both images and videos
- Play orchestration filtering (images excluded from video playback logic)
- Media filter toggle in HeaderBar: [Images] [Videos] [All]
- Filter preference persistence in settings

**Files created/modified:**
- `main/imageDimensions.js` (NEW) - EXIF-aware dimension extraction
- `src/components/VideoCard/ImageElement.jsx` (NEW)
- `main.js` - Extension constants, mediaType field
- `src/components/VideoCard/VideoCard.jsx` - Branch rendering
- `src/components/FullScreenModal.jsx` - Image support
- `src/hooks/video-collection/useVideoCollection.js` - Filter images from play
- `src/components/HeaderBar.jsx` - Filter toggle buttons
- `src/App.jsx` - mediaFilter state

**Dependencies added:** `sharp`

---

### Phase 2.5 Step 1: Resolution & Aspect Ratio Filter ✅ COMPLETE (2025-01-01)

Filter media by resolution ranges and aspect ratio categories.

**What was implemented:**
- Resolution presets: All, 512+, 768+, 1024+, 2K+, 4K+
- Aspect ratio categories: All, Square (0.9-1.1), Portrait (<0.9), Landscape (>1.1)
- `matchesResolution()` and `matchesAspectRatio()` filter functions
- UI in FiltersPopover with button groups
- EXIF orientation fix for iPhone photos (portrait photos correctly identified)

**Files modified:**
- `src/app/filters/filtersUtils.js` - Filter logic and presets
- `src/app/hooks/useFilterState.js` - Filter application
- `src/components/FiltersPopover.jsx` - Filter UI

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

### Phase 2.5 Step 3: Dataset Export ✅ COMPLETE (2025-01-01)

Export filtered images to LoRA training-ready folder structure.

**What was implemented:**
- Export dialog with destination picker
- Options: include captions, resize images, rename sequentially
- Copy or move file handling
- Progress bar during export
- Support for dataset.toml (musubi-tuner) and metadata.json (kohya) formats

**Files created/modified:**
- `main/datasetExporter.js` (NEW)
- `src/components/ExportDialog.jsx` (NEW)
- `main.js` - IPC handlers for export

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2025-01-01 | 0.3.0 | Phase 2.5 complete (Dataset Export) |
| 2025-01-01 | 0.2.0 | Phase 2 complete, Phase 2.5 Steps 1-2 complete |
| Pre-fork | 0.1.0 | VideoSwarm base (video-only) |
