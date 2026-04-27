# MediaHive — Rating mode spec

**Status:** ✅ Implemented in v0.8.0

A dedicated full-screen mode for rapidly rating images in a folder. Designed for LoRA dataset curation where you need to triage hundreds or thousands of images quickly.

---

## Overview

Rating mode takes over the entire window. Black background. One image at a time, as large as possible. Rate with keyboard (1-5), auto-advance to the next unrated image. The goal is maximum speed: load folder, hit R, rate-rate-rate-rate, done.

---

## Entry and exit

- **Enter:** press `R` from the main grid view, or click a "Rate" button in the toolbar (can reuse the existing rating filter area, or add a small button near Filters/Caption).
- **Exit:** press `Escape`. Returns to the grid view with all ratings persisted.
- On entry, the mode defaults to showing **unrated images only**. A toggle in the top bar switches to "all images" for re-rating.
- The queue is built from the current grid view (respects active filters, sort order, subfolder settings). If you filtered to a specific subfolder before entering rating mode, you only rate that subfolder.

---

## Layout

Maximum image real estate. Three elements only:

### 1. Top bar (minimal, ~28px tall)

- **Left:** progress counter — `127 / 847 unrated` + thin 2px progress bar (~100px wide, amber fill).
- **Right:** "Unrated only" toggle button (small, text-only, amber when active) + close button (X icon).
- No other controls. This bar is as thin as possible.

### 2. Image area (fills all remaining vertical space)

- The image is centered and scaled to fit (`object-fit: contain`), preserving aspect ratio.
- Navigation arrows on left/right edges — circular, semi-transparent, appear on hover. Left arrow = previous, right arrow = next.
- **On hover over the image:** a bottom gradient overlay fades in (transparent → semi-opaque black), containing:
  - Five star icons in a horizontal row (24px each, amber filled for the current rating, stroke-only for unset). Clickable.
  - Filename below the stars in small muted text (11px).
- **When not hovering:** the overlay is hidden. Just the image, nothing else.
- The stars also respond to keyboard input — pressing 1-5 fills the stars, shows a brief confirmation flash (the stars pulse amber for ~200ms), then auto-advances.

### 3. Filmstrip (bottom, ~44px tall total including padding)

- Horizontal scrolling row of thumbnails, 36×36px each, 4px gap, 3px border-radius.
- Current image has an amber border. Already-rated images show a tiny amber `★N` badge in the bottom-right corner and are at ~55% opacity. Unrated upcoming images are at ~35% opacity.
- The filmstrip auto-scrolls to keep the current image centered (or at least visible with a few upcoming thumbnails shown).
- Clicking a thumbnail jumps to that image.

---

## Keyboard shortcuts

These are all active but NOT displayed in the UI (no shortcut legend taking up space). Users discover them naturally — 1-5 is intuitive, arrows are standard.

| Key | Action |
|-----|--------|
| `1` - `5` | Set rating + auto-advance to next unrated |
| `0` | Clear rating (set to unrated) |
| `S` | Skip (advance without rating) |
| `←` | Previous image |
| `→` | Next image |
| `Cmd/Ctrl+Z` | Undo last rating + go back to that image |
| `Escape` | Exit rating mode |

---

## Auto-advance behavior

- After pressing 1-5, the mode advances to the **next unrated image** in the queue (not just the next image). This is the key speed feature — you never see already-rated images again unless you arrow back or toggle to "all".
- After pressing `S` (skip), it advances to the next unrated image as well. The skipped image remains unrated and will appear again if you re-enter rating mode.
- After pressing `0` (clear), the image stays on screen (it just became unrated, so leaving it visible makes sense). User presses a new rating or `S` to move on.
- The undo stack is linear — `Cmd+Z` goes back one step, restores the previous rating (or unrated state), and shows that image.

---

## Persistence

- Ratings are saved to the DB immediately via the existing `metadata:set-rating` IPC channel. No batch save, no "apply" button. The infrastructure already exists and works (confirmed in audit §7).
- If the user exits mid-session, all ratings so far are already persisted.

---

## Completion

- When all images in the queue have been rated (or there are no unrated images left in "unrated only" mode), show a simple centered message: "All done — N images rated" with a button to exit back to the grid. Or just auto-exit after a brief pause.

---

## Implementation notes

- This is a new React component, e.g. `src/components/RatingMode.jsx`. App.jsx manages the `isRatingMode` state and renders either the grid or the rating mode.
- The image list comes from the existing filtered/sorted video list in App state — no new data fetching needed.
- Preload the next 2-3 images in the queue using `new Image()` for instant transitions.
- The filmstrip can reuse thumbnail generation from the existing grid, or render smaller versions of the same images.
- No new IPC channels needed — `metadata:set-rating` already exists and works.
- The component should be under 300 lines per CLAUDE.md rules. If it needs to be bigger, split into `RatingMode.jsx` (orchestrator), `RatingImage.jsx` (image + hover overlay), `RatingFilmstrip.jsx` (thumbnail strip).

---

## Not in scope

- Video playback in rating mode (images only for now; videos can be added later with play-on-hover).
- Batch operations from rating mode (e.g., "delete all 1-star images"). That's a grid-view feature.
- Tag assignment in rating mode. Keep it focused on one thing: rating.
- Swipe gestures for mobile/trackpad. Keyboard-first for now.
