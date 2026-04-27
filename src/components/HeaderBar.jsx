import React, { useEffect, useRef, useState } from "react";
import RecentLocationsMenu from "./RecentLocationsMenu";
import { ZOOM_MAX_INDEX } from "../zoom/config.js";
import { clampZoomIndex } from "../zoom/utils.js";
import { SortKey } from "../sorting/sorting.js";

const TIER_MEDIUM = 1400;
const TIER_NARROW = 1000;

function tierForWidth(w) {
  if (w < TIER_NARROW) return "narrow";
  if (w < TIER_MEDIUM) return "medium";
  return "wide";
}

function useToolbarTier() {
  const [tier, setTier] = useState(() =>
    typeof window === "undefined" ? "wide" : tierForWidth(window.innerWidth)
  );
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setTier(tierForWidth(window.innerWidth));
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return tier;
}

// --- Minimal inline SVG icons (fallback for environments without icon libs)
const Icon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    {...props}
  />
);

const FolderIcon = (props) => (
  <Icon {...props}>
    <path d="M3 4h5l2 2h11v14H3z" />
  </Icon>
);

const TextIcon = (props) => (
  <Icon {...props}>
    <path d="M4 7V4h16v3" />
    <path d="M12 4v16" />
    <path d="M9 20h6" />
  </Icon>
);

const FilmIcon = (props) => (
  <Icon {...props}>
    <rect x="2" y="2" width="20" height="20" rx="2" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </Icon>
);

const ZoomInIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </Icon>
);

const GridIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Icon>
);

const ShuffleIcon = (props) => (
  <Icon {...props}>
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="4" y1="4" x2="9" y2="9" />
    <line x1="15" y1="15" x2="21" y2="21" />
  </Icon>
);

const SortIcon = (props) => (
  <Icon {...props}>
    <path d="M3 9l4-4 4 4" />
    <path d="M7 5v14" />
    <path d="M21 15l-4 4-4-4" />
    <path d="M17 5v14" />
  </Icon>
);

const FilterIcon = (props) => (
  <Icon {...props}>
    <path d="M4 4h16" />
    <path d="M6 9h12" />
    <path d="M10 14h4" />
    <path d="M12 14v6" />
  </Icon>
);

const ExportIcon = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);

const BrainIcon = (props) => (
  <Icon {...props}>
    <path d="M12 4.5a2.5 2.5 0 00-4.96-.46 2.5 2.5 0 00-1.98 3 2.5 2.5 0 00-1.32 4.24 3 3 0 00.34 5.58 2.5 2.5 0 002.96 3.08A2.5 2.5 0 0012 19.5a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-1.98-3A2.5 2.5 0 0012 4.5" />
    <path d="M15.7 10.4a3 3 0 01-4.3 2.6" />
    <path d="M9 10a.5.5 0 11-1 0 .5.5 0 011 0z" />
    <path d="M16 10a.5.5 0 11-1 0 .5.5 0 011 0z" />
  </Icon>
);

const GearIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </Icon>
);

const ImageIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </Icon>
);

const StarIcon = (props) => (
  <Icon {...props}>
    <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 9 12 2" />
  </Icon>
);

const CopyIcon = (props) => (
  <Icon {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </Icon>
);

const VideoIcon = (props) => (
  <Icon {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </Icon>
);

const MoreIcon = (props) => (
  <Icon {...props}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Icon>
);

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name ↑" },
  { value: "name-desc", label: "Name ↓" },
  { value: "created-asc", label: "Created ↑" },
  { value: "created-desc", label: "Created ↓" },
  { value: "random", label: "Random" },
];

export default function HeaderBar({
  isLoadingFolder,
  handleFolderSelect,
  handleWebFileSelection,
  recursiveMode,
  toggleRecursive,
  showFilenames,
  toggleFilenames,
  renderLimitStep,
  renderLimitLabel = "Max",
  renderLimitMaxStep = 10,
  handleRenderLimitChange,
  zoomLevel,
  handleZoomChangeSafe,
  getMinimumZoomLevel,
  sortKey,
  sortSelection,
  groupByFolders,
  onSortChange,
  onGroupByFoldersToggle,
  onReshuffle,
  recentFolders = [],
  onRecentOpen,
  hasOpenFolder = false,
  onFiltersToggle,
  filtersActiveCount = 0,
  filtersAreOpen = false,
  filtersButtonRef,
  mediaFilter = "all",
  onMediaFilterChange,
  onExportClick,
  imageCount = 0,
  onCaptionClick,
  onSettingsClick,
  duplicateMode = false,
  duplicateCount = 0,
  onDuplicatesClick,
  onDuplicatesExit,
  onDuplicatesRemoveAll,
  onRatingModeClick,
  ratingModeAvailable = false,
}) {
  const isElectron = !!window.electronAPI?.isElectron;
  const tier = useToolbarTier();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowTriggerRef = useRef(null);
  const overflowMenuRef = useRef(null);

  useEffect(() => {
    if (tier !== "narrow" && overflowOpen) setOverflowOpen(false);
  }, [tier, overflowOpen]);

  useEffect(() => {
    if (!overflowOpen) return undefined;
    const onDocPointer = (event) => {
      const t = event.target;
      if (
        overflowMenuRef.current?.contains(t) ||
        overflowTriggerRef.current?.contains(t)
      ) {
        return;
      }
      setOverflowOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOverflowOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [overflowOpen]);

  const minZoomIndex = getMinimumZoomLevel();

  return (
    <div className={`header header--tier-${tier}`}>
      <div className="nav-left">
        {isElectron ? (
          <button
            onClick={handleFolderSelect}
            className="file-input-label"
            disabled={isLoadingFolder}
            title="Select folder"
          >
            <FolderIcon />
          </button>
        ) : (
          <div className="file-input-wrapper">
            <input
              type="file"
              className="file-input"
              webkitdirectory="true"
              multiple
              onChange={handleWebFileSelection}
              style={{ display: "none" }}
              id="fileInput"
              disabled={isLoadingFolder}
            />
            <label htmlFor="fileInput" className="file-input-label" title="Open folder">
              <FolderIcon />
            </label>
          </div>
        )}

        <label className="subfolders-option" title="Scan subfolders">
          <input
            type="checkbox"
            checked={recursiveMode}
            onChange={toggleRecursive}
            disabled={isLoadingFolder}
          />
          <span className="filters-button-label">Subfolders</span>
        </label>

        {hasOpenFolder && recentFolders.length > 0 && (
          <div className="recent-folders-inline toolbar-collapsible">
            <RecentLocationsMenu items={recentFolders} onOpen={onRecentOpen} />
          </div>
        )}
      </div>

      <div className="controls" style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={toggleFilenames}
          className={`toggle-button ${showFilenames ? "active" : ""}`}
          disabled={isLoadingFolder}
          title="Show/hide filenames"
        >
          <TextIcon />
        </button>

        <div className="toolbar-group">
          <div className="media-filter-control" style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={() => onMediaFilterChange?.("images")}
              className={`toggle-button ${mediaFilter === "images" ? "active" : ""}`}
              disabled={isLoadingFolder}
              title="Show images only"
              style={{ borderRadius: "4px 0 0 4px" }}
            >
              <ImageIcon />
            </button>
            <button
              onClick={() => onMediaFilterChange?.("videos")}
              className={`toggle-button ${mediaFilter === "videos" ? "active" : ""}`}
              disabled={isLoadingFolder}
              title="Show videos only"
              style={{ borderRadius: "0" }}
            >
              <VideoIcon />
            </button>
            <button
              onClick={() => onMediaFilterChange?.("all")}
              className={`toggle-button ${mediaFilter === "all" ? "active" : ""}`}
              disabled={isLoadingFolder}
              title="Show all media"
              style={{ borderRadius: "0 4px 4px 0" }}
            >
              All
            </button>
          </div>
        </div>

        <div className="toolbar-group toolbar-group--collapses-narrow">
          <div className="video-limit-control" title="Limit rendered cards">
            <FilmIcon />
            <input
              type="range"
              min="0"
              max={renderLimitMaxStep}
              value={renderLimitStep}
              step="1"
              style={{ width: 100 }}
              onChange={(e) =>
                handleRenderLimitChange(parseInt(e.target.value, 10))
              }
              disabled={isLoadingFolder}
              aria-label="Rendered cards limit"
              aria-valuetext={renderLimitLabel}
            />
            <span style={{ fontSize: "0.8rem" }}>{renderLimitLabel}</span>
          </div>

          <div className="zoom-control" title="Zoom">
            <ZoomInIcon />
            <input
              type="range"
              min={minZoomIndex}
              max={ZOOM_MAX_INDEX}
              value={zoomLevel}
              step="1"
              onChange={(e) =>
                handleZoomChangeSafe(
                  clampZoomIndex(parseInt(e.target.value, 10))
                )
              }
              disabled={isLoadingFolder}
              style={{
                accentColor: zoomLevel >= minZoomIndex ? "#F59E0B" : "#ffa726",
              }}
            />
            {zoomLevel < minZoomIndex && (
              <span style={{ color: "#ffa726", fontSize: "0.7rem" }}>!</span>
            )}
          </div>
        </div>

        <div className="toolbar-group">
          <div className="sort-control toolbar-collapsible">
            <SortIcon />
            <select
              className="select-control"
              value={sortSelection}
              onChange={(e) => onSortChange(e.target.value)}
              disabled={isLoadingFolder}
              title="Choose sort order"
            >
              <option value="name-asc">Name ↑</option>
              <option value="name-desc">Name ↓</option>
              <option
                value="created-asc"
                title="Falls back to Modified time if creation time is unavailable."
              >
                Created ↑
              </option>
              <option
                value="created-desc"
                title="Falls back to Modified time if creation time is unavailable."
              >
                Created ↓
              </option>
              <option value="random">Random</option>
            </select>
          </div>

          <button
            onClick={onGroupByFoldersToggle}
            disabled={isLoadingFolder}
            className={`toggle-button toolbar-collapsible ${groupByFolders ? "active" : ""}`}
            title="Group by folders"
          >
            <GridIcon />
          </button>

          {sortKey === SortKey.RANDOM && (
            <button
              onClick={onReshuffle}
              disabled={isLoadingFolder}
              className="toggle-button toolbar-collapsible"
              title="Reshuffle"
            >
              <ShuffleIcon />
            </button>
          )}

          <div style={{ position: "relative" }}>
            <button
              ref={filtersButtonRef}
              onClick={onFiltersToggle}
              disabled={isLoadingFolder}
              className={`toggle-button ${
                filtersActiveCount > 0 || filtersAreOpen ? "active" : ""
              }`}
              title={
                filtersActiveCount > 0
                  ? `Filters active (${filtersActiveCount})`
                  : "Open filters"
              }
              type="button"
            >
              <FilterIcon />
              <span className="filters-button-label">Filters</span>
              {filtersActiveCount > 0 && (
                <span className="filters-button-badge">{filtersActiveCount}</span>
              )}
            </button>
          </div>

          {isElectron && (
            <button
              onClick={onExportClick}
              disabled={isLoadingFolder || imageCount === 0}
              className="toggle-button toolbar-collapsible"
              title={imageCount > 0 ? `Export ${imageCount} images` : "No images to export"}
              type="button"
            >
              <ExportIcon />
              <span className="filters-button-label">Export</span>
            </button>
          )}

          {isElectron && (
            <button
              onClick={onCaptionClick}
              disabled={isLoadingFolder}
              className="toggle-button"
              title="AI Captioning Setup"
              type="button"
            >
              <BrainIcon />
              <span className="filters-button-label">Caption</span>
            </button>
          )}

          {!duplicateMode && (
            <button
              onClick={onRatingModeClick}
              disabled={isLoadingFolder || !ratingModeAvailable}
              className="toggle-button toolbar-collapsible"
              title="Rate images (R)"
              type="button"
            >
              <StarIcon />
              <span className="filters-button-label">Rate</span>
            </button>
          )}

          {isElectron && !duplicateMode && (
            <button
              onClick={onDuplicatesClick}
              disabled={isLoadingFolder || !hasOpenFolder}
              className="toggle-button toolbar-collapsible"
              title="Find duplicate images"
              type="button"
            >
              <CopyIcon />
              <span className="filters-button-label">Duplicates</span>
            </button>
          )}

          {duplicateMode && (
            <>
              <button
                onClick={onDuplicatesRemoveAll}
                disabled={duplicateCount === 0}
                className="toggle-button duplicate-remove-btn"
                title={`Remove ${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''}`}
                type="button"
              >
                Remove All ({duplicateCount})
              </button>
              <button
                onClick={onDuplicatesExit}
                className="toggle-button"
                title="Exit duplicate finder"
                type="button"
              >
                Exit
              </button>
            </>
          )}

          {isElectron && (
            <button
              onClick={onSettingsClick}
              disabled={isLoadingFolder}
              className="toggle-button"
              title="Settings"
              type="button"
            >
              <GearIcon />
            </button>
          )}

          {tier === "narrow" && (
            <button
              ref={overflowTriggerRef}
              type="button"
              className={`toggle-button overflow-trigger${
                overflowOpen ? " active" : ""
              }`}
              onClick={() => setOverflowOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              title="More options"
            >
              <MoreIcon />
            </button>
          )}
        </div>
      </div>
      {tier === "narrow" && overflowOpen && (
        <div
          ref={overflowMenuRef}
          className="overflow-menu"
          role="menu"
          aria-label="More toolbar options"
        >
                  <div className="overflow-menu__section">
                    <div className="overflow-menu__title">Sort</div>
                    <div className="overflow-menu__pills">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`overflow-menu__pill${
                            sortSelection === opt.value ? " is-active" : ""
                          }`}
                          onClick={() => onSortChange(opt.value)}
                          disabled={isLoadingFolder}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="overflow-menu__row">
                      <button
                        type="button"
                        className={`overflow-menu__row-button${
                          groupByFolders ? " is-active" : ""
                        }`}
                        onClick={onGroupByFoldersToggle}
                        disabled={isLoadingFolder}
                      >
                        <GridIcon />
                        <span>Group by folders</span>
                      </button>
                      {sortKey === SortKey.RANDOM && (
                        <button
                          type="button"
                          className="overflow-menu__row-button"
                          onClick={onReshuffle}
                          disabled={isLoadingFolder}
                        >
                          <ShuffleIcon />
                          <span>Reshuffle</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-menu__section">
                    <div className="overflow-menu__title">View</div>
                    <div className="overflow-menu__slider-row">
                      <ZoomInIcon />
                      <input
                        type="range"
                        min={minZoomIndex}
                        max={ZOOM_MAX_INDEX}
                        value={zoomLevel}
                        step="1"
                        onChange={(e) =>
                          handleZoomChangeSafe(
                            clampZoomIndex(parseInt(e.target.value, 10))
                          )
                        }
                        disabled={isLoadingFolder}
                        aria-label="Zoom level"
                        style={{ flex: 1, accentColor: "var(--color-accent)" }}
                      />
                      <span className="overflow-menu__slider-label">Zoom</span>
                    </div>
                    <div className="overflow-menu__slider-row">
                      <FilmIcon />
                      <input
                        type="range"
                        min="0"
                        max={renderLimitMaxStep}
                        value={renderLimitStep}
                        step="1"
                        onChange={(e) =>
                          handleRenderLimitChange(
                            parseInt(e.target.value, 10)
                          )
                        }
                        disabled={isLoadingFolder}
                        aria-label="Rendered cards limit"
                        style={{ flex: 1, accentColor: "var(--color-accent)" }}
                      />
                      <span className="overflow-menu__slider-label">
                        {renderLimitLabel}
                      </span>
                    </div>
                  </div>

                  {isElectron && (
                    <div className="overflow-menu__section">
                      <div className="overflow-menu__title">Actions</div>
                      <button
                        type="button"
                        className="overflow-menu__row-button"
                        onClick={() => {
                          onExportClick?.();
                          setOverflowOpen(false);
                        }}
                        disabled={isLoadingFolder || imageCount === 0}
                      >
                        <ExportIcon />
                        <span>
                          Export
                          {imageCount > 0 ? ` (${imageCount})` : ""}
                        </span>
                      </button>
                      {!duplicateMode && (
                        <button
                          type="button"
                          className="overflow-menu__row-button"
                          onClick={() => {
                            onDuplicatesClick?.();
                            setOverflowOpen(false);
                          }}
                          disabled={isLoadingFolder || !hasOpenFolder}
                        >
                          <CopyIcon />
                          <span>Find duplicates</span>
                        </button>
                      )}
                    </div>
                  )}

          {hasOpenFolder && recentFolders.length > 0 && (
            <div className="overflow-menu__section">
              <div className="overflow-menu__title">Recent folders</div>
              <div className="overflow-menu__recent-list">
                {recentFolders.slice(0, 8).map((it) => (
                  <button
                    key={it.path}
                    type="button"
                    className="overflow-menu__row-button overflow-menu__row-button--small"
                    onClick={() => {
                      onRecentOpen?.(it.path);
                      setOverflowOpen(false);
                    }}
                    title={it.path}
                  >
                    <FolderIcon />
                    <span className="overflow-menu__truncate">{it.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
