import React from "react";
import RecentLocationsMenu from "./RecentLocationsMenu";
import { ZOOM_MAX_INDEX } from "../zoom/config.js";
import { clampZoomIndex } from "../zoom/utils.js";
import { SortKey } from "../sorting/sorting.js";

// --- Minimal inline SVG icons (fallback for environments without icon libs)
const Icon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    stroke="currentColor"
    strokeWidth="2"
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

const VideoIcon = (props) => (
  <Icon {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" />
  </Icon>
);

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
}) {
  const isElectron = !!window.electronAPI?.isElectron;

  const minZoomIndex = getMinimumZoomLevel();

  const dividerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginLeft: "1rem",
    paddingLeft: "1rem",
    borderLeft: "1px solid #ccc",
  };

  return (
    <div className="header">
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
          <span>Subfolders</span>
        </label>

        {hasOpenFolder && recentFolders.length > 0 && (
          <RecentLocationsMenu items={recentFolders} onOpen={onRecentOpen} />
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

        <div style={dividerStyle}>
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

        <div style={dividerStyle}>
          <div className="video-limit-control" title="Limit rendered VideoCards">
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
              aria-label="Rendered VideoCards limit"
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
                accentColor: zoomLevel >= minZoomIndex ? "#51cf66" : "#ffa726",
              }}
            />
            {zoomLevel < minZoomIndex && (
              <span style={{ color: "#ffa726", fontSize: "0.7rem" }}>!</span>
            )}
          </div>
        </div>

        <div style={dividerStyle}>
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

          <button
            onClick={onGroupByFoldersToggle}
            disabled={isLoadingFolder}
            className={`toggle-button ${groupByFolders ? "active" : ""}`}
            title="Group by folders"
          >
            <GridIcon />
          </button>

          {sortKey === SortKey.RANDOM && (
            <button
              onClick={onReshuffle}
              disabled={isLoadingFolder}
              className="toggle-button"
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
              className="toggle-button"
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
        </div>
      </div>
    </div>
  );
}
