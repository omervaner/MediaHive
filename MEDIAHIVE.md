# MediaHive - Architecture & Development Plan

## What Is This?

MediaHive is a fork of [Video Swarm](https://github.com/Cerzi/videoswarm) (GPL v3), extended to:
1. Support images AND videos
2. Integrate local AI (Qwen3-VL via Ollama) for batch captioning/tagging
3. Serve as Ömer's personal media management tool for AI-generated content

## Current State

Video Swarm v0.5.2 - Electron + React app that:
- Displays videos in a masonry grid, all playing simultaneously
- Smart playback (pauses off-screen videos)
- SQLite database for metadata (tags, ratings, fingerprints)
- File watching for live updates
- Drag & drop to external apps

## Target State

MediaHive v1.0 - Same beautiful UI, but:
- Handles images (.jpg, .png, .webp, .gif) AND videos
- AI-powered batch captioning via local Ollama
- Auto-tagging from captions
- Quality scoring
- Dataset export for LoRA training

---

## Architecture Overview

```
MediaHive/
├── main.js                 # Electron main process
├── preload.js              # IPC bridge
├── main/                   # Backend modules
│   ├── database.js         # SQLite (better-sqlite3)
│   ├── watcher.js          # File system watcher (chokidar)
│   ├── fingerprint.js      # File hashing for tracking
│   ├── videoDimensions.js  # → rename to mediaDimensions.js
│   └── [NEW] ai-service.js # Ollama integration
├── src/                    # React frontend
│   ├── App.jsx             # Main app
│   ├── components/
│   │   ├── VideoCard/      # → rename to MediaCard/
│   │   ├── HeaderBar.jsx
│   │   ├── MetadataPanel.jsx
│   │   └── [NEW] AIPanel.jsx
│   └── hooks/
│       ├── video-collection/ # → rename to media-collection/
│       └── [NEW] useAIService.js
└── package.json
```

---

## Development Phases

### Phase 1: Make It Run & Rebrand
**Goal:** Get the app running, rebrand from VideoSwarm to MediaHive

Tasks:
- [ ] Verify app launches (`npm run dev`)
- [ ] Update package.json (name, author, repo)
- [ ] Update window title
- [ ] Replace icons (can use placeholder for now)
- [ ] Create GitHub repo, push initial commit

### Phase 2: Add Image Support
**Goal:** Display images alongside videos with a mode toggle

**UI Design Decision:** 
- Add toggle buttons in header: `[Images] [Videos] [All]`
- Backend loads ALL media, frontend filters by mode
- Mode persisted in settings
- Default to last-used mode

Key Changes:
1. `main.js` - Extend `isVideoFile()` to `isMediaFile()`
   ```js
   const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
   const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv', '.3gp', '.ogv'];
   
   function isMediaFile(fileName) {
     const ext = path.extname(fileName).toLowerCase();
     return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
   }
   
   function isImageFile(fileName) {
     const ext = path.extname(fileName).toLowerCase();
     return IMAGE_EXTENSIONS.includes(ext);
   }
   ```

2. `createVideoFileObject()` → `createMediaFileObject()`
   - Add `mediaType: 'image' | 'video'` field
   - For images: get dimensions via sharp or native

3. `VideoCard.jsx` → `MediaCard.jsx`
   - Render `<img>` for images, `<video>` for videos
   - Images don't need play/pause logic
   - Both need click-to-fullscreen

4. Database schema - no changes needed (fingerprint-based, media-agnostic)

5. Rename all "video" references to "media" in:
   - Hook names
   - Variable names
   - UI labels

### Phase 3: AI Integration (Ollama + Qwen3-VL)
**Goal:** Batch caption/tag media using local AI

New Components:
1. `main/ai-service.js` - Backend service
   ```js
   // Communicates with Ollama at localhost:11434
   // Endpoints:
   //   - captionImage(imagePath) → string
   //   - captionVideo(videoPath, frameCount) → string
   //   - batchCaption(paths[]) → Map<path, caption>
   ```

2. `src/components/AIPanel.jsx` - UI for AI features
   - "Caption Selected" button
   - "Caption All" button
   - Progress indicator
   - Caption preview/edit before saving

3. IPC channels:
   - `ai:caption-single` 
   - `ai:caption-batch`
   - `ai:get-status` (is Ollama running?)

4. Auto-tagging from captions:
   - Extract keywords from caption
   - Suggest tags, user confirms

### Phase 4: Advanced Features (Future)
- Quality scoring (blur detection, composition)
- Duplicate finder (perceptual hashing)
- Dataset export (folder + captions for LoRA training)
- Face detection overlay
- NSFW classifier

---

## Technical Notes

### Ollama Integration
- Model: `qwen3-vl:8b` (already installed on Windows machine)
- API: `http://localhost:11434/api/chat`
- For videos: extract N frames, send as image array
- Rate limiting: process one at a time to avoid OOM

### Database Schema (existing, no changes needed)
```sql
files (fingerprint, last_known_path, size, created_ms, updated_at, width, height)
tags (id, name)
file_tags (fingerprint, tag_id, added_at)
ratings (fingerprint, value, updated_at)
```

### Cross-Platform Notes
- Development: Mac (this machine)
- Testing: Windows (RTX 5090 machine with Ollama)
- Ollama only runs on Windows machine, so AI features need graceful fallback

---

## Workflow

1. **This conversation (Claude Desktop):** Architecture, planning, oversight
2. **Claude Code (Terminal):** Implementation
3. **Git:** Push from Mac, pull on Windows for testing

---

## Commands Reference

```bash
# Development
npm run dev          # Start in dev mode (hot reload)
npm run start        # Start without hot reload
npm run electron:dev # Full dev mode with Vite

# Build
npm run electron:build  # Build for current platform
npm run electron:dist   # Build distributable

# Test
npm test             # Run tests
```

---

## Current Session TODO

1. [ ] Verify app launches
2. [ ] Create GitHub repo (omervaner/MediaHive)
3. [ ] Rebrand package.json
4. [ ] Phase 2: Image support
