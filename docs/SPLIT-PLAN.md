# main.js Split — Plan

**Status:** plan only. Do not start until Ömer reviews. This document is the spec
the next conversation will execute against.

**Goal:** carve `main.js` (currently 2,343 lines) into focused IPC modules under
`main/`, leaving `main.js` as a ~200-line entry point that wires everything up.

**Hard constraint — pure extraction.** No bug fixes, no behaviour changes, no
renames "for consistency". Every IPC channel keeps its exact name, payload
shape, and ordering. The audit findings (`docs/AUDIT-2026-04-26.md`) are out of
scope for this pass — they get their own dedicated PRs after this lands.

**One exception, granted by Ömer in the request:** delete the dead
`ipcMain.handle("move-to-trash", ...)` handler at `main.js:1826-1834` and the
preload wrapper at `preload.js:168-170`. Audit §1.2 — the handler references an
undefined `trash` symbol, every live caller uses `bulkMoveToTrash` instead.

---

## 1. The DI pattern (one shape, used by every new module)

Every new IPC module exports a single `init` function. The init takes a `deps`
object containing only what the module actually needs. Mutable state (e.g.
`mainWindow`, `currentSettings`) is passed as **getter functions**, not values
— because mainWindow gets recreated on profile switch and currentSettings gets
mutated by save handlers. The existing `main/ipc-trash.js` is the closest
template (registers handlers on the passed `ipcMain`), but our modules need
more than just `ipcMain`.

```js
// main/ipc-caption.js (illustrative — actual deps listed in §3)
function init({ ipcMain, getMainWindow, getCurrentSettings, loadSettings, getStore }) {
  ipcMain.handle("caption:generate", async (_e, imagePath, requestId) => { … });
  // …other caption channels…
}
module.exports = { init };
```

Then `main.js`:

```js
require("./main/ipc-caption").init({
  ipcMain,
  getMainWindow: () => mainWindow,
  getCurrentSettings: () => currentSettings,
  loadSettings,
  getStore: getMetadataStore,
});
```

Why getters and not values:
- `mainWindow` is set inside `createWindow()` (line 711) which runs after
  module-level wire-up.
- `currentSettings` is reassigned by `loadSettings`, `saveSettings`,
  `reconfigureForProfile`. A captured value goes stale on every settings
  write.
- `getMetadataStore` is already a getter (`main/database.js`) because the
  store is reset on profile switch.

This keeps the modules ignorant of profile lifecycle and avoids passing
mutable closures around.

**Internal consistency check:** every example below uses this same shape —
`{ ipcMain, …named getters/functions… }` and `module.exports = { init }`. No
classes, no factory-of-factories, no event-bus. Match
`main/ipc-trash.js`'s "register on ipcMain, return nothing" style.

---

## 2. Module breakdown — what moves, what stays

The user-requested six modules cover ~half of main.js's IPC surface. The other
half stays in main.js for this pass. §6 lists open questions for the modules
not specified.

### 2.1 Six new modules (this PR)

| New file | What goes in | main.js source ranges |
|---|---|---|
| `main/ipc-caption.js` | `caption:generate`, `caption:tags`, `caption:both`, `caption:cancel`, `caption:batch`, `caption:batch-cancel` | 2020-2136 |
| `main/ipc-metadata.js` | `metadata:list-tags`, `metadata:add-tags`, `metadata:remove-tag`, `metadata:set-rating`, `metadata:get`, `metadata:set-caption` | 1692-1807 |
| `main/ipc-settings.js` | `save-settings`, `load-settings`, `get-settings`, `request-settings`, `save-settings-partial` + the supporting fns `computeDefaultZoomLevel`, `normaliseLoadedSettings`, `tryMigrateLegacySettings`, `loadSettings`, `saveSettings`, `saveSettingsPartial`, `defaultSettings`, and the `currentSettings` / `currentSettingsProfileId` state | 127-128, 170-191 (defaults + state), 498-629 (helpers + load/save), 1487-1518 (handlers) |
| `main/ipc-files.js` | `select-folder`, `read-directory`, `start-folder-watch`, `stop-folder-watch`, `show-item-in-folder`, `open-in-external-player`, `get-file-info`, `copy-file`, `get-file-properties` + `IMAGE_EXTENSIONS`/`VIDEO_EXTENSIONS`/`MEDIA_EXTENSIONS`, `isVideoFile`/`isImageFile`/`isMediaFile`, `formatFileSize`, `createVideoFileObject`, `scanFolderForChanges`, the `lastFolderScan` Map, the `folderWatcher` instance, `wireWatcherEvents` | 38-41 (extensions), 222-372 (helpers + createVideoFileObject), 374-462 (scanFolderForChanges), 464-496 (watcher creation + wire), 1520-1560 (select-folder, show-item-in-folder, open-in-external-player), 1626-1690 (read-directory), 1810-1858 (file-info, copy-file, get-file-properties), 1867-1891 (start/stop-folder-watch) |
| `main/ipc-duplicates.js` | `duplicates:find` + the `computeDHash`/`findDuplicateGroups` import wiring (the implementation already lives in `main/perceptualHash.js` — only the IPC handler moves) | 2227-2271 |
| `main/menu.js` | `createMenu`, `buildProfilesMenuTemplate`, `handleCreateProfileFromMenu`, `handleRenameActiveProfileFromMenu`, `handleDeleteActiveProfileFromMenu`, `promptForProfileName` | 827-1151 |

### 2.2 What stays in main.js

After extraction, main.js keeps:

- App bootstrap: `app.commandLine.appendSwitch` calls, `app.setName`, electron
  imports, `loadSupportContent`/`openDonationPage`, `assetPath`, command-line
  arg logging.
- `createWindow()` (lines 700-825).
- `dataLocationManager` instantiation (line 17-19) and the three
  `data-location:*` IPC handlers (lines 1294-1311).
- `profiles:*` IPC handlers (lines 1313-1389) — they coordinate big
  cross-module state changes (watcher reset, store reset, recent store
  init, settings load, menu rebuild) so they belong with the orchestrator.
- `reconfigureForProfile` (lines 644-697) and the `activeProfileId` /
  `getActiveProfileId` / `getProfilePath` / `getSettingsPath` /
  `getProfileDisplayName` helpers (lines 127, 196-218) — same reason.
- Recent folders store: `loadRecentStoreClass`, `initRecentStore`,
  `ensureRecentStore`, `getRecentFolders`, `saveRecentFolders`,
  `addRecentFolder`, `removeRecentFolder`, `clearRecentFolders`, plus the
  `recent:*` IPC handlers (lines 1153-1265, 1861-1864).
- The three `ipcMain.on` (sendSync) handlers — `thumb:put`, `thumb:get`,
  `dnd:start-file` (lines 1391-1485). Tightly coupled to thumbnailCache
  init-on-demand and profile path.
- Top-level handlers: `get-app-version`, `support:open-donation`,
  `open-external`, `quit-app`, `copy-to-clipboard`, `confirm-move-to-trash`
  (lines 1268-1292, 1563-1623).
- `dataset:pick-folder`, `dataset:export`, `fileops:pick-folder`,
  `fileops:copy-move` — see §6 open question 1.
- `ollama:*` six handlers — see §6 open question 2.
- `data:*` four handlers — see §6 open question 3.
- `mem:get` (lines 2273-end). Small, no good home, stays.
- `app.whenReady` block, `window-all-closed`, `before-quit`, `activate`
  handlers — whatever's at the very bottom of main.js.

### 2.3 Estimated final main.js size

The six modules subtract roughly:
- caption: ~117 lines
- metadata: ~116 lines
- settings: ~155 lines (handlers + helpers + state)
- files: ~360 lines (this is the biggest — createVideoFileObject is huge)
- duplicates: ~45 lines
- menu: ~325 lines

Total subtraction: ~1,118 lines. With ~25 lines of new `init` calls and
some glue, main.js drops from 2,343 → ~1,225. **That misses Ömer's 200-line
target by a wide margin.**

To hit ~200 lines we'd also need to extract: profiles handlers + lifecycle,
recent folders, dataset/fileops/ollama/data handlers, thumb/dnd handlers, and
the createWindow + bootstrap. That's a much bigger refactor than what was
asked for. Flagging this now per `feedback_plan_deviation_transparency.md`:
**this six-module split lands main.js at ~1,200 lines, not ~200.** Ömer can
either accept the larger first cut, or expand the module list. See §6 open
question 4 for a proposed extra-modules list that would get us closer to 200.

---

## 3. Per-module detail

For each, I list: the channels registered, the deps the init needs, and
non-obvious gotchas.

### 3.1 `main/ipc-caption.js`

```js
function init({ ipcMain, getMainWindow, getCurrentSettings, loadSettings, getStore })
```

- Channels: `caption:generate`, `caption:tags`, `caption:both`,
  `caption:cancel`, `caption:batch`, `caption:batch-cancel`.
- Why `loadSettings` *and* `getCurrentSettings`: the handlers do
  `currentSettings || (await loadSettings())` (e.g. line 2021) — fall back to
  loading if the cache hasn't been populated. Both must be available.
- Why `getStore`: the `caption:batch` onProgress callback persists captions
  via `store.setCaption(...)` and `store.assignTags(...)` (lines 2107-2117).
- Why `getMainWindow`: not actually needed — the batch handler uses
  `event.sender.send("caption:batch-progress", ...)` (line 2129), not
  `mainWindow.webContents`. Safe to drop from deps. Confirm during extraction.
- Imports the existing `captionService` module — no change there.
- **Carries audit §1.3 (single-image not persisted) and §1.4 (broken cancel)
  forward unchanged.** Behaviour-identical.

### 3.2 `main/ipc-metadata.js`

```js
function init({ ipcMain, getStore })
```

- Channels: all `metadata:*` six handlers.
- Only needs `getStore`. Each handler grabs the store at call time, calls a
  method, returns the result.
- The `[DEBUG] metadata:set-caption called:` log at line 1788 stays —
  pure extraction.

### 3.3 `main/ipc-settings.js`

This is the trickiest one. Settings has both IPC handlers **and** module-level
mutable state (`currentSettings`, `currentSettingsProfileId`) that the rest of
main.js reads and writes.

```js
function init({
  ipcMain,
  app,                       // for app.isPackaged checks if any (none today, future-proof)
  getMainWindow,             // for "settings-loaded" send in request-settings + broadcast
  getActiveProfileId,        // closes over main.js's profile state
  profileManager,            // for DEFAULT_PROFILE_ID + getUserDataPath
  getProfilePath,            // resolves the settings.json path per profile
  getSettingsPath,           // = getProfilePath() + "settings.json"
})
```

- Channels: `save-settings`, `load-settings`, `get-settings`,
  `request-settings`, `save-settings-partial`.
- **Exports beyond `init`**: this module also needs to expose
  `loadSettings`, `saveSettings`, `saveSettingsPartial`, and `getCurrentSettings`
  for main.js to call from `reconfigureForProfile` and to pass into
  `ipc-caption`/`ipc-files`. Proposed export shape:

```js
module.exports = {
  init,                  // registers IPC handlers + sets up internal state
  loadSettings,          // async (profileId) => settings
  saveSettings,          // async (settings, profileId) => void
  saveSettingsPartial,   // async (partial, profileId) => void
  getCurrentSettings,    // () => currentSettings | null
  resetCurrentSettings,  // () => void  (called by reconfigureForProfile, line 687-688)
  defaultSettings,       // exported because broadcastProfileChange falls back to it
};
```

- The `[DEBUG]` console.logs at lines 1499 and 1505 stay.
- The `tryMigrateLegacySettings` bug from audit §1.6 (callback-fs awaited like
  promise-fs at lines 545-546) — **moves verbatim**, fix later.
- `saveWindowBounds` (lines 608-616) currently calls
  `saveSettingsPartial({ windowBounds: bounds })`. It's invoked from
  `mainWindow.on("moved", ...)` and `("resized", ...)` in `createWindow`.
  Stays in main.js (because it's tied to mainWindow), but updates its import
  to call `settingsModule.saveSettingsPartial`.

### 3.4 `main/ipc-files.js`

The largest extraction. Owns folder scanning, the file-system watcher
integration, file metadata helpers, and the constants that say "this file is
media".

```js
function init({
  ipcMain,
  app,
  dialog,
  getMainWindow,
  getStore,
  detectScreenshot,           // imported in main.js from main/screenshotDetector
  getImageDimensions,         // from main/imageDimensions
  getVideoDimensions,         // from main/videoDimensions
  // (alternative: import these inside ipc-files.js directly — see §3.4 note)
})
```

- Channels: `select-folder`, `read-directory`, `start-folder-watch`,
  `stop-folder-watch`, `show-item-in-folder`, `open-in-external-player`,
  `get-file-info`, `copy-file`, `get-file-properties`.
- **Exports beyond `init`**: main.js's `reconfigureForProfile` (line 668)
  does `lastFolderScan = new Map()` and (line 664) `await folderWatcher.stop()`.
  After extraction, the module needs to expose:

```js
module.exports = {
  init,
  stopWatcher,        // async () => void
  resetScanState,     // () => void  (clears lastFolderScan Map)
  isMediaFile,        // re-exported because main.js's profile/menu code may reference it; verify with grep
};
```

- **Note on dependency style:** `getImageDimensions`, `getVideoDimensions`,
  `detectScreenshot` are pure functions imported from sibling main/ modules.
  Cleaner to `require` them inside `ipc-files.js` directly than to thread them
  through deps. Goes against "explicit DI everywhere" but matches the existing
  pattern (e.g. `main/datasetExporter.js` imports `sharp` directly). I'd lean
  toward direct require for these three; deps stays smaller. Calling this out
  for review.
- `createVideoFileObject` is async, ~120 lines, uses many imports. It's the
  bulk of this file. Cross-references `getMetadataStore`,
  `detectScreenshot`, `getImageDimensions`, `getVideoDimensions`,
  `formatFileSize`, `isImageFile`, `isMediaFile`. All need to come along.
- `scanFolderForChanges` references `mainWindow.webContents.send(...)` for
  add/remove/change events. Replace with `getMainWindow()` calls. Same for
  `wireWatcherEvents`.
- `formatFileSize` is also referenced inside `createVideoFileObject` only.
  Move both. Grep confirmed `formatFileSize` has no other callers in main.js.

### 3.5 `main/ipc-duplicates.js`

```js
function init({ ipcMain, getStore })
```

- One channel: `duplicates:find`.
- `computeDHash`, `hammingDistance`, `findDuplicateGroups` already live in
  `main/perceptualHash.js` — just `require` them inside this module.
- Only needs `getStore` for `store.getPhashes`/`store.setPhash`.

### 3.6 `main/menu.js`

```js
function init({
  app,
  Menu,
  dialog,
  ipcMain,                  // for the input-prompt back-channel inside promptForProfileName
  getMainWindow,
  profileManager,
  getActiveProfileId,
  getProfileDisplayName,
  reconfigureForProfile,    // closure into main.js's lifecycle
  broadcastProfileChange,   // ditto
  openDonationPage,         // for the support menu item
})
```

- Exports `init` which builds and sets the menu, plus a re-callable
  `createMenu` (because `reconfigureForProfile` calls `createMenu()` at line
  695). Two-export shape:

```js
module.exports = {
  init,        // initial menu install at startup
  rebuild,     // = createMenu, called after profile rename/create/delete/switch
};
```

- `promptForProfileName` (line 827) listens on `ipcMain.on("profiles:prompt-response", …)`
  — keep ipcMain in deps for this.
- The "About VideoSwarm" / "Support VideoSwarm on Ko-fi" labels (audit §2)
  move along verbatim. Brand fix is a follow-up PR.

---

## 4. Order of operations (per CLAUDE.md rule 4: "one thing at a time")

Each step is an independent extraction. **One commit per step** — not one
big commit at the end. If step 5 breaks something, revert step 5 without
losing 1-4. Commit messages should be of the form `Extract <channel-group>
into main/<filename>` so `git log --oneline` reads as the history of the
split.

After each commit, run `npm run electron:dev` and verify the corresponding
feature still works. Smoke-test list per step is in §5. Per
`feedback_launch_after_phase.md`, launch after the final step too.

1. **Delete dead `move-to-trash`** — drop the handler at main.js:1826-1834
   and the preload wrapper at preload.js:168-170. Smallest possible change,
   gets a clean baseline. Smoke-test: trash a file via context menu (uses
   `bulkMoveToTrash`, should still work).
2. **`main/ipc-duplicates.js`** — smallest module, single channel, isolated
   dep set. Good warm-up. Smoke-test: open a folder with known duplicates,
   click Find Duplicates, verify groups appear.
3. **`main/ipc-metadata.js`** — also small. Smoke-test: tag a file, set a
   rating, generate a caption (ensures all six channels still respond).
4. **`main/ipc-caption.js`** — depends on settings shape (model/endpoint),
   but doesn't depend on the settings module being extracted yet because it
   accepts `loadSettings` + `getCurrentSettings` as deps. Smoke-test: run a
   2-3 file batch caption.
5. **`main/menu.js`** — independent of the IPC modules. Smoke-test: open
   each menu, create + rename + delete a profile.
6. **`main/ipc-settings.js`** — touches the most: every other extracted
   module reads `getCurrentSettings`. Save the most-coupled extraction for
   when the surrounding modules are stable. Smoke-test: change a setting
   (zoom, sort), reload, confirm it persisted; switch profiles.
7. **`main/ipc-files.js`** — biggest module, last. Owns the watcher and
   `createVideoFileObject`. Smoke-test: open a folder, verify thumbnails +
   metadata; add/rename/delete a file in the OS to test watcher events;
   recursive on/off.

After step 7: full smoke test — open folder, scroll, play a video, view an
image, tag, rate, generate single caption, batch caption, find duplicates,
trash, copy/move, export dataset, switch profile.

---

## 5. Behaviour-preservation checklist

Before each module's commit:

- [ ] Every channel name unchanged. (`grep -n "ipcMain.handle\|ipcMain.on" main.js main/*.js | sort` should still hit the same set of channel-name strings.)
- [ ] Every handler signature `(event, …args)` unchanged.
- [ ] Every return shape unchanged. (Spot-check: handlers that return `{ success, error }` keep doing exactly that, including the typo'd error messages.)
- [ ] `[DEBUG]` console.logs preserved verbatim (audit §5 cleanup is a separate PR).
- [ ] No imports added except `require`s that already existed elsewhere in main.js — pure rearrangement, no new deps. CLAUDE.md rule 7 is satisfied trivially.
- [ ] `preload.js` only edited for the move-to-trash deletion in step 1; otherwise untouched.

---

## 6. Decisions (resolved by Ömer)

These came up during planning. All resolved before execution starts. Notes
preserve the reasoning so a future reader understands why each call was made.

**Q1. `dataset:*` and `fileops:*` handlers — RESOLVED: stay in main.js
this PR.** They're thin wrappers, not worth the noise right now. Lines
1894-1941 stay put. Re-evaluate in the follow-up PR.

**Q2. `ollama:*` handlers — RESOLVED: stay in main.js this PR.** They're
settings wrappers, not caption logic. Moving them now creates a "where
does it live" debate (caption-feature vs. settings-feature) that doesn't
need to happen yet. Lines 1944-2017 stay put.

**Q3. `data:*` handlers — RESOLVED: stay in main.js this PR.** Same
reasoning as Q1/Q2 — defer until the follow-up PR. Lines 2139-2225 stay put.

**Q4. The 200-line target — RESOLVED: two-PR plan.** This PR lands main.js
at ~1,200 (still a massive improvement over 2,343). Follow-up PR extracts
the remaining 8 modules to hit ~200. The 200 number was aspirational; two
clean PRs beat one monster diff. The follow-up's module list:

- `main/ipc-profiles.js` — `profiles:*` handlers + `reconfigureForProfile`
  + `promptForProfileName` (overlaps with menu.js).
- `main/ipc-recent.js` — `recent:*` handlers + the electron-store init.
- `main/ipc-data-mgmt.js` — `data:*` handlers.
- `main/ipc-export.js` — `dataset:*` + `fileops:*`.
- `main/ipc-ollama.js` — `ollama:*`.
- `main/ipc-thumbs.js` — `thumb:*` + `dnd:*`.
- `main/window.js` — `createWindow`, `assetPath`,
  `getDefaultZoomForScreen`, `saveWindowBounds`.
- `main/support.js` — `loadSupportContent`, `openDonationPage`,
  `support:open-donation`, `open-external`, `quit-app`, `get-app-version`,
  `copy-to-clipboard`, `confirm-move-to-trash`.

**Q5. `ipcMain.on` (sendSync) handlers — RESOLVED: leave alone this PR.**
`thumb:put`, `thumb:get`, `dnd:start-file` (lines 1391-1485). Tightly
coupled to thumbnail cache and window lifecycle, not worth touching here.
They go in the follow-up PR's `main/ipc-thumbs.js`.

**Q6. Tests — RESOLVED: skip for this refactor.** The whole point is
behaviour-identical. Adding tests now means doing two things at once,
which violates CLAUDE.md rule 4 ("one thing at a time"). Test PR comes
after.

---

## 7. Review checklist — APPROVED

- [x] DI shape in §1 — approved (init function, getter functions for
      mutable state, direct `require` for pure-function siblings).
- [x] Six-module scope landing main.js at ~1,200 lines, with a follow-up
      PR to hit ~200 (Q4).
- [x] Q1-Q3 (dataset/fileops, ollama, data) — stay in main.js this PR.
- [x] Order in §4 (smallest → largest, settings before files because
      files depends on settings).
- [x] Step 1 (delete dead `move-to-trash`) is its own first commit, then
      the six module-extraction commits follow (one per module).
- [x] Tests (Q6) — skip for this refactor, follow-up PR.

Plan is locked. The next session can execute mechanically. Each module is
self-contained enough that a fresh agent with this doc + CLAUDE.md should
produce the same result.
