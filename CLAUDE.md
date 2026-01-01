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
   - Parse JPEG/PNG/WebP/GIF headers to extract dimensions
   - Use buffer reading (no external dependencies)
   - Export `getImageDimensions(filePath)` → `{ width, height, aspectRatio }`

2. Update `createVideoFileObject()` in main.js:
   - If `isImageFile(filePath)`: call `getImageDimensions()`
   - Else: call existing `getVideoDimensions()`

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
- [ ] Verify filter toggle switches between modes
- [ ] Verify filter preference persists after restart
