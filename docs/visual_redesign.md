# MediaHive — Visual redesign spec

This document describes visual changes to be implemented. Each section is a self-contained task. Functional behavior stays the same — this is purely cosmetic and layout work.

Accent color throughout: `#F59E0B` (amber-500), hover `#D97706`, text-on-amber `#422006`.

---

## 1. Status bar redesign

**File:** `src/components/StatusBar.jsx` (or wherever the info strip below the toolbar lives)

### What changes

Replace the current emoji-heavy, pipe-delimited debug string with a structured flex row using three grouped sections separated by thin vertical dividers.

### Layout (left to right)

1. **Sort info** — small sort icon (3 horizontal lines, decreasing width) + text like `Name ↑ · Grouped by folders`. No emoji.

2. **Divider** — 0.5px vertical line, 12px tall, using border-secondary color.

3. **Stats group** — four items, each is: small monoline SVG icon (14×14) + bold count + muted label.
   - Grid icon + **44** media
   - Window icon + **44** rendered
   - Eye icon + **20** in view
   - Play triangle icon + **0** playing

4. **Divider**

5. **Memory indicator** — a thin (4px tall, ~80px wide) progress bar filled with amber accent, + muted text showing size like `685 MB`. No percentage number. Tooltip on hover shows percentage and the `Ctrl+G` / `Cmd+G` hint for manual GC.

### Styling

- Background: use the app's secondary/surface background color, not hardcoded dark.
- Border: 0.5px solid border color.
- Border-radius: 6px.
- Font: 12px, system sans-serif.
- Counts are font-weight 500, primary text color.
- Labels are font-weight 400, secondary/muted text color.
- Icons: 12-14px, monoline, stroke only, currentColor (inherits from text color).
- No emoji anywhere.
- White-space: nowrap on the container.

### Narrow window behavior

When the container is too narrow to fit all stats with labels, degrade to a compact form: drop icons and labels, show just the counts separated by middle dots. Example: `Name ↑ | 44 · 20 visible · 0 playing | ▬ 685 MB`

This can be done with a CSS container query or a media query breakpoint — implementation choice is up to CC.

### Fix: "videos" → "media"

The status bar currently says "44 videos" regardless of content type. Change to "44 media" (or "44 images" / "44 videos" / "44 media" dynamically based on what's actually loaded, if that data is available). At minimum, use "media" as the generic term.

### Remove from the bar

- All emoji
- "Press Ctrl+G for manual GC" — move this to a tooltip on the memory bar
- The `active window` stat — this is only meaningful during debugging, not normal use. If you want to keep it, gate it behind a debug/dev mode toggle.

---

## 2. Toolbar responsive collapse

**File:** `src/components/HeaderBar.jsx` + associated CSS

### Overview

The toolbar currently renders all controls in a single non-wrapping row with no overflow handling. When the window narrows, right-side controls get clipped with no way to reach them. Implement a three-tier responsive collapse.

### Tier 1: Wide (1400px+) — full labels

Everything visible. Action buttons (Filters, Export, Caption, Duplicates) show icon + text label. Both sliders (zoom + render limit) visible at full width. Sort dropdown shows icon + current value + chevron. Subfolders button shows icon + label.

### Tier 2: Medium (1000–1400px) — icon-only actions

- Action buttons (Filters, Export, Caption, Duplicates, Settings) drop their text labels, become icon-only with `title` attribute tooltips.
- Subfolders button drops its label, icon-only.
- Sort dropdown drops the sort value label, shows just the sort icon + chevron.
- Zoom slider gets narrower (width ~56px instead of ~80px).
- Render limit slider hides (it's a power-user control, accessible via Settings).
- "Recent..." dropdown stays as-is (it's already short).

### Tier 3: Narrow (below 1000px) — overflow menu

- Secondary actions (Export, Duplicates, Sort, Layout toggle, Recent folders) move into a `···` overflow popover menu.
- Only these stay visible: folder picker, subfolders toggle, media type filter (img/vid/all), count, Filters, Caption, Settings.
- The overflow button is a simple 28×28px button with three dots, positioned at the right end of the toolbar.
- The overflow popover is a simple vertical list of the hidden actions, styled consistently with the existing FiltersPopover or similar existing popovers in the app.

### Implementation notes

- Use CSS media queries or container queries for breakpoints. If container queries aren't practical in the current Electron/React setup, media queries are fine.
- All buttons at all tiers must have `flex: 0 0 auto` to prevent squishing before overflow kicks in.
- The toolbar container needs `white-space: nowrap` and `min-width: 0` on flex children.
- The right-edge fade (from the §1.15 CSS fix already applied) should still work — it sits on the `.controls` wrapper and provides a visual hint that scrollable content exists. It coexists with the collapse behavior: at wide/medium, no scroll needed; at narrow, the overflow menu catches everything before scroll is needed.

### Priority of controls (what stays visible longest)

1. Folder picker (always)
2. Media type filter + count (always)
3. Filters button (always — primary workflow)
4. Caption button (always — primary workflow)
5. Settings (always — access to all config)
6. Subfolders toggle (drops label at medium)
7. Sort (drops label at medium, moves to overflow at narrow)
8. Zoom slider (shrinks at medium, moves to overflow at narrow)
9. Export (icon-only at medium, overflow at narrow)
10. Duplicates (icon-only at medium, overflow at narrow)
11. Layout toggle (overflow at narrow)
12. Render limit slider (hidden at medium+, available in Settings)
13. Recent folders dropdown (overflow at narrow)

---

## 3. General icon consistency

Currently the toolbar uses a mix of emoji (for status bar) and SVG icons (for buttons). After these changes:

- All icons are monoline SVG, 14×14px in the toolbar, 12-14px in the status bar.
- Stroke-only, no fills, `stroke-width: 1.5`, `currentColor` for color inheritance.
- The active/selected state (e.g., "All" media type button) uses the amber accent as background with dark amber text (`#422006`).

---

## 4. Future considerations (not in this pass)

- Dark mode support for the status bar and toolbar (currently the app uses a dark theme — ensure the redesigned components work with both light and dark backgrounds).
- The two competing About dialogs (menu vs Settings) — pick one and retire the other.
- Internal code renames (VideoCard → MediaCard, video prop → media prop) — noisy mechanical sweep, separate task.
- Overflow menu as a proper dropdown component with keyboard navigation and focus management.
