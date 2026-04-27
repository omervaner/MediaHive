import React from "react";

const Svg = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    aria-hidden="true"
    {...props}
  />
);

const SortLinesIcon = (props) => (
  <Svg {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="14" y2="12" />
    <line x1="4" y1="18" x2="9" y2="18" />
  </Svg>
);

const GridIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Svg>
);

const WindowIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
  </Svg>
);

const EyeIcon = (props) => (
  <Svg {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

const PlayIcon = (props) => (
  <Svg {...props}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </Svg>
);

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || "");
const GC_SHORTCUT = isMac ? "⌘⇧G" : "Ctrl+Shift+G";

export default function DebugSummary({
  total = 0,
  rendered = 0,
  playing = 0,
  inView = 0,
  memoryStatus,
  sortStatus,
  mediaFilter = "all",
}) {
  const mediaLabel =
    mediaFilter === "images"
      ? "images"
      : mediaFilter === "videos"
      ? "videos"
      : "media";

  const memoryMB = memoryStatus?.currentMemoryMB;
  const pressure = Math.min(100, Math.max(0, memoryStatus?.memoryPressure ?? 0));
  const memoryTooltip =
    memoryStatus != null
      ? `Memory ${pressure}% — Press ${GC_SHORTCUT} for manual GC`
      : undefined;

  return (
    <div className="status-bar" role="status" aria-live="polite">
      {sortStatus && (
        <div className="status-bar__group status-bar__sort">
          <SortLinesIcon />
          <span>{sortStatus}</span>
        </div>
      )}
      {sortStatus && <div className="status-bar__divider" />}

      <div className="status-bar__group status-bar__stats">
        <div className="status-bar__stat status-bar__stat--media">
          <GridIcon />
          <span className="status-bar__count">{total}</span>
          <span className="status-bar__label">{mediaLabel}</span>
        </div>
        <div className="status-bar__stat status-bar__stat--rendered">
          <WindowIcon />
          <span className="status-bar__count">{rendered}</span>
          <span className="status-bar__label">rendered</span>
        </div>
        <div className="status-bar__stat status-bar__stat--inview">
          <EyeIcon />
          <span className="status-bar__count">{inView}</span>
          <span className="status-bar__label">in view</span>
        </div>
        <div className="status-bar__stat status-bar__stat--playing">
          <PlayIcon />
          <span className="status-bar__count">{playing}</span>
          <span className="status-bar__label">playing</span>
        </div>
      </div>

      {memoryStatus && (
        <>
          <div className="status-bar__divider status-bar__divider--push" />
          <div
            className={`status-bar__group status-bar__memory${
              memoryStatus.isNearLimit ? " is-near-limit" : ""
            }`}
            title={memoryTooltip}
          >
            <div className="status-bar__memory-bar" aria-hidden="true">
              <div
                className="status-bar__memory-fill"
                style={{ width: `${pressure}%` }}
              />
            </div>
            <span className="status-bar__label">{memoryMB} MB</span>
          </div>
        </>
      )}
    </div>
  );
}
