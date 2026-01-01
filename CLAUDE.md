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

## Current Task: Phase 2 - Image Support

### Overview
Extend MediaHive to display images (.jpg, .png, .webp, .gif) alongside videos with a filter toggle.

### Implementation Steps

#### Step 1: Backend - Extension Detection & Media Type Field ✅ COMPLETE
**File:** `main.js`

1. Add shared constants at top:
```js
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv', '.3gp', '.ogv'];
```

2. Add new helper functions:
```js
function isMediaFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
}

function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}
```

3. Update 3 locations using hardcoded extensions:
   - ~Line 421: Pass `isMediaFile` to watcher instead of `isVideoFile`
   - ~Line 336-347: `scanFolderForChanges()` - use shared constants
   - ~Line 1572-1583: `read-directory` IPC handler - use shared constants

4. Add `mediaType` field in `createVideoFileObject()`:
```js
mediaType: isImageFile(filePath) ? 'image' : 'video',
```

---

#### Step 2: Backend - Image Dimension Extraction ✅ COMPLETE
**Files:** `main/imageDimensions.js` (NEW), `main.js`

1. Create `main/imageDimensions.js`:
   - Uses `sharp` package for reliable dimension extraction
   - Handles EXIF orientation (tags 5-8 swap width/height for 90° rotations)
   - Critical for iPhone photos which store portrait images as landscape + EXIF rotation
   - Only caches successful results (allows retry on failure)
   - Export `getImageDimensions(filePath)` → `{ width, height, aspectRatio }`

2. Update `createVideoFileObject()` in main.js:
   - If `isImageFile(filePath)`: call `getImageDimensions()`
   - Else: call existing `getVideoDimensions()`

**Dependencies added:** `sharp` (image processing)

---

#### Step 3: Frontend - Update File Selection Filter ⏭️ SKIPPED (for now)
**File:** `src/app/hooks/useElectronFolderLifecycle.js`

*Note: This is for drag-drop/web file selection. Skipped since we're using folder picker.*

Update `handleWebFileSelection()` (~line 158):
```js
const isMediaType = f.type.startsWith("video/") || f.type.startsWith("image/");
const hasExt = /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv|3gp|ogv|jpg|jpeg|png|webp|gif)$/i.test(f.name);
```

---

#### Step 4: Frontend - MediaCard Component ✅ COMPLETE
**Files:** `src/components/VideoCard/VideoCard.jsx`, `src/components/VideoCard/ImageElement.jsx` (NEW)

1. Create `ImageElement.jsx`:
   - Renders `<img>` with same styling as video
   - Handles `onLoad`, `onError` events
   - No play/pause logic
   - Reports dimensions via `onLoad` callback

2. Update `VideoCard.jsx`:
   - Detect media type: `const isImage = video.mediaType === 'image'`
   - Branch rendering:
     - Images: Use `<img>` element, skip play/pause/stall logic
     - Videos: Existing `<video>` logic unchanged
   - Keep shared logic: selection, context menu, drag, visibility, error UI

---

#### Step 5: Frontend - Skip Play Orchestration for Images ✅ COMPLETE
**File:** `src/hooks/video-collection/useVideoCollection.js`

Filter images out of play orchestration by filtering visibleVideos and loadedVideos before passing to usePlayOrchestrator.

---

#### Step 6: Frontend - FullScreenModal Support ✅ COMPLETE
**File:** `src/components/FullScreenModal.jsx`

- Added `isImage` detection based on `mediaType`
- Render `<img>` for images, `<video>` for videos
- Images don't show Space play/pause in keyboard shortcuts
- Arrow navigation works the same for both

---

#### Step 7: Frontend - Media Filter Toggle ✅ COMPLETE
**Files:** `src/components/HeaderBar.jsx`, `src/App.jsx`

1. Added toggle buttons in `HeaderBar.jsx`:
   - Three buttons: `[Images icon]` `[Videos icon]` `[All]`
   - Button group styling with active state
   - Pass `mediaFilter` and `onMediaFilterChange` as props

2. Added state in `App.jsx`:
   - `mediaFilter: 'images' | 'videos' | 'all'` (default: `'all'`)
   - `mediaFilteredVideos` useMemo filters before useFilterState
   - `handleMediaFilterChange` callback with settings persistence

3. Updated `defaultSettings` in `main.js`:
   - Added `mediaFilter: 'all'`

4. Settings persistence:
   - Added `setMediaFilter` to useElectronFolderLifecycle
   - Loads from settings on startup
   - Saves via `saveSettingsPartial`

---

## Files Changed Summary

| File | Change |
|------|--------|
| `main.js` | Extension constants, isMediaFile(), isImageFile(), mediaType field, mediaFilter setting |
| `main/imageDimensions.js` | NEW - Parse image headers for dimensions |
| `src/app/hooks/useElectronFolderLifecycle.js` | Accept image MIME types, load mediaFilter from settings |
| `src/components/VideoCard/VideoCard.jsx` | Branch rendering for image vs video |
| `src/components/VideoCard/ImageElement.jsx` | NEW - Image element component |
| `src/components/FullScreenModal.jsx` | Support both element types |
| `src/hooks/video-collection/useVideoCollection.js` | Filter images from play orchestration |
| `src/components/HeaderBar.jsx` | Filter toggle buttons |
| `src/App.jsx` | mediaFilter state and filtering logic |

---

## What Stays Unchanged

- Database/metadata system (fingerprints, tags, ratings)
- File watcher module (already generic)
- Masonry layout (aspect-ratio based, media-agnostic)
- Filtering and sorting (tag/rating/name/date)
- Thumbnail cache system
- IPC communication

---

## Testing Checklist

- [ ] Open folder with mixed images and videos
- [ ] Verify both display in masonry grid
- [ ] Verify images show immediately (no play state)
- [ ] Verify videos still play/pause correctly
- [ ] Verify fullscreen works for both types
- [ ] Verify tagging/rating works for both types
- [ ] Verify file watcher detects new images
- [x] Verify filter toggle switches between modes
- [x] Verify filter preference persists after restart

---

## Phase 2.5: Filtering & Analysis Features

### Overview
Add advanced filtering, duplicate detection, quality analysis, and dataset export for LoRA training workflows.

---

### Step 1: Resolution & Aspect Ratio Filter ✅ COMPLETE
**Files:** `src/components/FiltersPopover.jsx`, `src/app/filters/filtersUtils.js`, `src/app/hooks/useFilterState.js`

**Implemented:**
1. Added to `filtersUtils.js`:
   - `RESOLUTION_PRESETS`: All, 512+, 768+, 1024+, 2K+, 4K+
   - `ASPECT_RATIO_OPTIONS`: All, Square (0.9-1.1), Portrait (<0.9), Landscape (>1.1)
   - `matchesResolution(file, minRes)` - checks short edge >= minRes
   - `matchesAspectRatio(file, category)` - checks AR category
   - Updated `createDefaultFilters()` with `minResolution` and `aspectRatio`
   - Updated `useFiltersActiveCount()` to count new filters

2. Added to `useFilterState.js`:
   - Extended `normalizeFiltersDraft()` for new filter fields
   - Added resolution and aspect ratio checks in `filteredVideos` useMemo

3. Added to `FiltersPopover.jsx`:
   - Resolution section with preset buttons
   - Aspect Ratio section with category buttons
   - Handlers for both filter types

**Note:** Requires EXIF-aware dimension extraction (Step 2 of Phase 2) to work correctly with iPhone photos. The `sharp` package handles EXIF orientation so portrait iPhone photos are correctly identified.

---

### Step 2: Duplicate Finder
**Files:** `main/duplicateFinder.js` (NEW), `main.js`, `src/components/DuplicatesPanel.jsx` (NEW)

**Goal:** Find visually similar images using perceptual hashing. Essential for cleaning datasets.

**Backend - Perceptual Hashing:**
1. Create `main/duplicateFinder.js`:
   - Implement pHash (perceptual hash) algorithm:
     - Resize image to 32x32 grayscale
     - Apply DCT (discrete cosine transform)
     - Reduce to 8x8 by keeping top-left (low frequencies)
     - Generate 64-bit hash based on median comparison
   - Compare hashes using Hamming distance
   - Threshold: <5 bits different = likely duplicate
   
2. Store hash in database:
   - Add `phash TEXT` column to files table
   - Compute on first index, cache for future

3. IPC handlers:
   - `duplicates:compute-hashes` - batch compute for folder
   - `duplicates:find-groups` - return groups of similar files

**Frontend - Duplicates UI:**
1. Create `DuplicatesPanel.jsx`:
   - "Scan for Duplicates" button
   - Progress bar during scan
   - Display groups of duplicates
   - For each group: show thumbnails, let user pick "keeper"
   - Bulk actions: delete others, move to folder

2. Visual indicators:
   - Badge on cards that have duplicates
   - Filter: "Show only duplicates"

**Algorithm detail (pHash):**
```js
async function computePHash(imagePath) {
  // 1. Load and resize to 32x32 grayscale
  // 2. Apply 32x32 DCT
  // 3. Take top-left 8x8 (low frequency components)
  // 4. Calculate median of 64 values
  // 5. Generate 64-bit hash: bit=1 if value > median
  // 6. Return as hex string (16 chars)
}

function hammingDistance(hash1, hash2) {
  // XOR and count bits
  let diff = 0;
  for (let i = 0; i < hash1.length; i++) {
    const x = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    diff += x.toString(2).split('1').length - 1;
  }
  return diff;
}
```

---

### Step 3: Screenshot Detector
**Files:** `main/screenshotDetector.js` (NEW), `main.js`

**Goal:** Automatically identify screenshots (phone/desktop) without AI. Useful for filtering out non-generated content.

**Detection Methods (combine for confidence score):**

1. **Filename patterns** (high confidence):
   ```js
   const SCREENSHOT_PATTERNS = [
     /^screenshot/i,
     /^screen shot/i,
     /^IMG_\d+/i,           // iOS
     /^\d{4}-\d{2}-\d{2}/,  // Android (date prefix)
     /^Simulator Screen/i,
     /^Capture/i,
   ];
   ```

2. **Exact resolution matches** (high confidence):
   ```js
   const KNOWN_SCREEN_RESOLUTIONS = [
     // Desktop
     [1920, 1080], [2560, 1440], [3840, 2160], [1440, 900], [1680, 1050],
     // iPhone
     [1170, 2532], [1284, 2778], [1290, 2796], [1179, 2556],
     // Android common
     [1080, 2400], [1080, 2340], [1440, 3200],
   ];
   ```

3. **Aspect ratio patterns** (medium confidence):
   - Phone screenshots: very tall (AR < 0.5 or > 2.0)
   - Exact 16:9, 16:10, 4:3 ratios

4. **Edge detection** (medium confidence):
   - Screenshots have many straight horizontal/vertical edges
   - Detect using Sobel filter, count edge pixels
   - High ratio of H/V edges vs diagonal = likely screenshot

5. **Status bar detection** (optional, more complex):
   - Top 5% of image: check for solid color band
   - Look for time pattern (HH:MM) in that region

**Implementation:**
```js
function detectScreenshot(filePath, dimensions, fileName) {
  let score = 0;
  
  // Filename check (+40)
  if (SCREENSHOT_PATTERNS.some(p => p.test(fileName))) score += 40;
  
  // Exact resolution match (+50)
  if (isKnownScreenRes(dimensions.width, dimensions.height)) score += 50;
  
  // Extreme aspect ratio (+20)
  if (dimensions.aspectRatio < 0.5 || dimensions.aspectRatio > 2.0) score += 20;
  
  return {
    isScreenshot: score >= 50,
    confidence: Math.min(score, 100),
    reasons: [...]
  };
}
```

**Storage:**
- Add `isScreenshot BOOLEAN`, `screenshotConfidence INTEGER` to files table
- Compute during indexing

**UI:**
- Filter toggle: "Hide screenshots" / "Show only screenshots"
- Visual badge on screenshot cards

---

### Step 4: Quality Scorer
**Files:** `main/qualityScorer.js` (NEW), `main.js`

**Goal:** Automated image quality assessment to filter out blurry, dark, or low-quality generations.

**Quality Metrics:**

1. **Blur Detection (Laplacian Variance):**
   - Apply Laplacian filter (edge detection)
   - Calculate variance of result
   - Low variance = blurry image
   ```js
   // Laplacian kernel: [0,1,0], [1,-4,1], [0,1,0]
   // Variance < 100 = blurry, > 500 = sharp
   ```

2. **Exposure Analysis (Histogram):**
   - Calculate luminance histogram
   - Check distribution:
     - Underexposed: >50% pixels below 30
     - Overexposed: >50% pixels above 225
     - Good: bell curve centered around 128
   ```js
   function exposureScore(histogram) {
     const dark = histogram.slice(0, 30).reduce((a,b) => a+b, 0);
     const light = histogram.slice(225).reduce((a,b) => a+b, 0);
     const total = histogram.reduce((a,b) => a+b, 0);
     // Returns -1 (under), 0 (good), 1 (over)
   }
   ```

3. **Noise Detection:**
   - High-frequency energy in smooth regions
   - Compare original vs gaussian-blurred version
   - Large difference in "flat" areas = noise

4. **Resolution Quality:**
   - Penalize very low resolution (<512 on short edge)
   - Detect upscaled images (look for interpolation artifacts)

**Composite Score:**
```js
function computeQualityScore(imagePath) {
  const blur = getBlurScore(imagePath);        // 0-100
  const exposure = getExposureScore(imagePath); // 0-100
  const noise = getNoiseScore(imagePath);       // 0-100
  const resolution = getResolutionScore(imagePath); // 0-100
  
  // Weighted average
  const overall = (blur * 0.4) + (exposure * 0.25) + (noise * 0.2) + (resolution * 0.15);
  
  return {
    overall,
    blur,
    exposure, 
    noise,
    resolution,
    grade: overall > 80 ? 'A' : overall > 60 ? 'B' : overall > 40 ? 'C' : 'D'
  };
}
```

**Storage:**
- Add `qualityScore INTEGER`, `qualityGrade TEXT` to files table
- Compute on-demand (expensive) or background process

**UI:**
- Quality badge on cards (A/B/C/D or color indicator)
- Filter: "A only", "B+", "Hide D grade"
- Sort by quality score
- Bulk action: "Delete all D grade"

---

### Step 5: Dataset Export
**Files:** `main/datasetExporter.js` (NEW), `src/components/ExportDialog.jsx` (NEW)

**Goal:** Export selected/filtered images to a LoRA training-ready folder structure.

**Export Options Dialog:**
```
┌─────────────────────────────────────────┐
│ Export Dataset                          │
├─────────────────────────────────────────┤
│ Source: 47 images (filtered selection)  │
│                                         │
│ Destination: [Browse...] /path/to/dest  │
│                                         │
│ ☑ Include caption files (.txt)          │
│   Caption source: ○ Tags  ○ AI caption  │
│                                         │
│ ☐ Resize images                         │
│   Target: [1024] px (short edge)        │
│                                         │
│ ☑ Rename sequentially                   │
│   Prefix: [dataset_] → dataset_001.jpg  │
│                                         │
│ ☐ Generate metadata file                │
│   Format: ○ dataset.toml (musubi)       │
│           ○ metadata.json (kohya)       │
│                                         │
│ File handling: ○ Copy  ○ Move           │
│                                         │
│ [Cancel]                    [Export]    │
└─────────────────────────────────────────┘
```

**Backend - Export Logic:**
```js
async function exportDataset(options) {
  const {
    files,           // Array of file objects to export
    destination,     // Target folder path
    includeCaptions, // Boolean
    captionSource,   // 'tags' | 'ai'
    resize,          // null or { shortEdge: 1024 }
    rename,          // null or { prefix: 'dataset_' }
    generateMeta,    // null or 'toml' | 'json'
    fileHandling,    // 'copy' | 'move'
  } = options;
  
  // Create destination folder
  await fs.mkdir(destination, { recursive: true });
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const newName = rename 
      ? `${rename.prefix}${String(i + 1).padStart(3, '0')}${file.extension}`
      : file.name;
    
    // Copy/move image
    const destPath = path.join(destination, newName);
    if (resize) {
      await resizeAndSave(file.fullPath, destPath, resize.shortEdge);
    } else {
      await fs[fileHandling](file.fullPath, destPath);
    }
    
    // Create caption file
    if (includeCaptions) {
      const caption = captionSource === 'tags' 
        ? file.tags.join(', ')
        : file.aiCaption || '';
      const captionPath = destPath.replace(/\.[^.]+$/, '.txt');
      await fs.writeFile(captionPath, caption);
    }
    
    // Progress callback
    onProgress((i + 1) / files.length);
  }
  
  // Generate metadata file
  if (generateMeta === 'toml') {
    await generateMusubiToml(destination, files);
  } else if (generateMeta === 'json') {
    await generateKohyaJson(destination, files);
  }
}
```

**musubi-tuner TOML format:**
```toml
[general]
shuffle_caption = true
caption_extension = ".txt"
keep_tokens = 1

[[datasets]]
resolution = 1024
batch_size = 1

  [[datasets.subsets]]
  image_dir = "."
  num_repeats = 10
```

**kohya metadata.json format:**
```json
{
  "dataset_001.jpg": { "caption": "tag1, tag2, tag3" },
  "dataset_002.jpg": { "caption": "tag1, tag4" }
}
```

**UI Flow:**
1. User filters/selects images
2. Click "Export Dataset" button (in header or context menu)
3. ExportDialog opens with options
4. User configures and clicks Export
5. Progress modal during export
6. Success: "Exported 47 images to /path/to/dest" with "Open Folder" button

---

## Phase 2.5 Implementation Order

1. **Resolution/AR Filter** - Easiest, pure UI, data already exists
2. **Screenshot Detector** - Medium, no heavy computation
3. **Dataset Export** - Medium, most immediately useful for your workflow
4. **Duplicate Finder** - Medium-hard, needs pHash implementation
5. **Quality Scorer** - Hardest, needs image processing

---

## Dependencies Note

For image processing (blur detection, pHash), we may need:
- `sharp` - Fast image processing (resize, grayscale) - already common in Electron apps
- Or pure JS implementation using canvas (slower but no native deps)

Ask before adding any new dependencies.

---

## Phase 3: AI Captioning Integration

**📄 See `docs/PHASE3-AI-CAPTIONING.md` for full specification.**

### Summary
- Ollama + Qwen3-VL for local AI captioning (privacy-first, unlimited usage)
- Model options with clear download size warnings:
  - `qwen3-vl:4b` (~3.3 GB) - Fast, 8GB+ RAM
  - `qwen3-vl:8b` (~6.1 GB) - Recommended, 16GB+ RAM
  - `qwen3-vl:32b` (~20 GB) - Maximum quality, 32GB+ RAM
- First-run setup dialog prompts user to download model
- Batch captioning with progress UI
- Caption display and editing in details panel
- Integrates with Dataset Export (AI captions → .txt files)

### Prerequisites
- Phase 2.5 Dataset Export complete
- User has Ollama installed (ollama.com)

### Implementation Steps
1. Ollama Setup & Model Management (detection, download with progress)
2. Caption Service (generate captions/tags via Ollama API)
3. Batch Captioning UI (progress, results)
4. Caption Display & Editing
5. Storage integration
