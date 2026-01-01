import React, { useState, useEffect, useRef, useCallback } from "react";

const RESIZE_OPTIONS = [
  { value: null, label: "Original" },
  { value: 512, label: "512px" },
  { value: 768, label: "768px" },
  { value: 1024, label: "1024px" },
  { value: 2048, label: "2048px" },
];

export default function ExportDialog({ open, onClose, files = [] }) {
  const dialogRef = useRef(null);
  const [destination, setDestination] = useState("");
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeValue, setResizeValue] = useState(1024);
  const [renameEnabled, setRenameEnabled] = useState(true);
  const [renamePrefix, setRenamePrefix] = useState("dataset_");
  const [fileHandling, setFileHandling] = useState("copy");
  const [captionSource, setCaptionSource] = useState("ai");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  // Filter to images only
  const imageFiles = files.filter((f) => f.mediaType === "image");
  const imageCount = imageFiles.length;

  // Count images with captions/tags
  const withAiCaption = imageFiles.filter((f) => f.aiCaption).length;
  const withTags = imageFiles.filter((f) => f.tags?.length > 0).length;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDestination("");
      setIsExporting(false);
      setProgress({ current: 0, total: 0 });
      setResult(null);
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open || isExporting) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isExporting, onClose]);

  // Focus management
  useEffect(() => {
    if (!open) return;
    const previousActiveElement = document.activeElement;
    const firstFocusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus?.();
    return () => {
      previousActiveElement?.focus?.();
    };
  }, [open]);

  // Progress listener
  useEffect(() => {
    if (!open || !window.electronAPI?.dataset?.onProgress) return undefined;
    const unsubscribe = window.electronAPI.dataset.onProgress((prog) => {
      setProgress(prog);
    });
    return unsubscribe;
  }, [open]);

  const handlePickFolder = useCallback(async () => {
    if (!window.electronAPI?.dataset?.pickFolder) return;
    const folder = await window.electronAPI.dataset.pickFolder();
    if (folder) {
      setDestination(folder);
    }
  }, []);

  const handleExport = useCallback(async () => {
    if (!destination || imageCount === 0) return;
    if (!window.electronAPI?.dataset?.export) return;

    setIsExporting(true);
    setProgress({ current: 0, total: imageCount });
    setResult(null);

    try {
      const options = {
        files: imageFiles,
        destination,
        includeCaptions,
        captionSource,
        resize: resizeEnabled ? { shortEdge: resizeValue } : null,
        rename: renameEnabled ? { prefix: renamePrefix } : null,
        fileHandling,
      };

      const res = await window.electronAPI.dataset.export(options);
      setResult(res);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsExporting(false);
    }
  }, [
    destination,
    imageCount,
    imageFiles,
    includeCaptions,
    captionSource,
    resizeEnabled,
    resizeValue,
    renameEnabled,
    renamePrefix,
    fileHandling,
  ]);

  const handleOpenFolder = useCallback(() => {
    if (destination && window.electronAPI?.showItemInFolder) {
      window.electronAPI.showItemInFolder(destination);
    }
  }, [destination]);

  if (!open) return null;

  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div
      className="export-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isExporting) {
          onClose?.();
        }
      }}
    >
      <div
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog__title"
        ref={dialogRef}
      >
        <header className="export-dialog__header">
          <h2 id="export-dialog__title">Export Dataset</h2>
        </header>

        <div className="export-dialog__body">
          {result ? (
            <div className="export-dialog__result">
              {result.success ? (
                <>
                  <p className="export-dialog__success">
                    Successfully exported {result.exported} images to:
                  </p>
                  <p className="export-dialog__path">{result.destination}</p>
                  {result.errors?.length > 0 && (
                    <details className="export-dialog__errors">
                      <summary>{result.errors.length} errors occurred</summary>
                      <ul>
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <button
                    type="button"
                    className="export-dialog__open-folder"
                    onClick={handleOpenFolder}
                  >
                    Open Folder
                  </button>
                </>
              ) : (
                <p className="export-dialog__error">
                  Export failed: {result.error}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="export-dialog__source">
                Source: <strong>{imageCount} images</strong> from current filter
              </p>

              <div className="export-dialog__field">
                <label>Destination Folder</label>
                <div className="export-dialog__folder-row">
                  <input
                    type="text"
                    value={destination}
                    readOnly
                    placeholder="No folder selected"
                    className="export-dialog__folder-input"
                  />
                  <button
                    type="button"
                    onClick={handlePickFolder}
                    disabled={isExporting}
                    className="export-dialog__browse-btn"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div className="export-dialog__field">
                <label className="export-dialog__checkbox">
                  <input
                    type="checkbox"
                    checked={includeCaptions}
                    onChange={(e) => setIncludeCaptions(e.target.checked)}
                    disabled={isExporting}
                  />
                  Include caption files (.txt)
                </label>
                {includeCaptions && (
                  <div className="export-dialog__caption-options">
                    <div className="export-dialog__radio-group" style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                      <label className="export-dialog__radio">
                        <input
                          type="radio"
                          name="captionSource"
                          value="ai"
                          checked={captionSource === "ai"}
                          onChange={(e) => setCaptionSource(e.target.value)}
                          disabled={isExporting}
                        />
                        AI captions ({withAiCaption} images)
                      </label>
                      <label className="export-dialog__radio">
                        <input
                          type="radio"
                          name="captionSource"
                          value="tags"
                          checked={captionSource === "tags"}
                          onChange={(e) => setCaptionSource(e.target.value)}
                          disabled={isExporting}
                        />
                        Tags ({withTags} images)
                      </label>
                    </div>
                    <span className="export-dialog__hint">
                      {captionSource === "ai" 
                        ? "Uses AI-generated descriptions (falls back to tags if no caption)"
                        : "Uses comma-separated tags"}
                    </span>
                  </div>
                )}
              </div>

              <div className="export-dialog__field">
                <label className="export-dialog__checkbox">
                  <input
                    type="checkbox"
                    checked={resizeEnabled}
                    onChange={(e) => setResizeEnabled(e.target.checked)}
                    disabled={isExporting}
                  />
                  Resize images
                </label>
                {resizeEnabled && (
                  <select
                    value={resizeValue}
                    onChange={(e) => setResizeValue(Number(e.target.value))}
                    disabled={isExporting}
                    className="export-dialog__select"
                  >
                    {RESIZE_OPTIONS.filter((o) => o.value !== null).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} (short edge)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="export-dialog__field">
                <label className="export-dialog__checkbox">
                  <input
                    type="checkbox"
                    checked={renameEnabled}
                    onChange={(e) => setRenameEnabled(e.target.checked)}
                    disabled={isExporting}
                  />
                  Rename sequentially
                </label>
                {renameEnabled && (
                  <div className="export-dialog__rename-row">
                    <input
                      type="text"
                      value={renamePrefix}
                      onChange={(e) => setRenamePrefix(e.target.value)}
                      disabled={isExporting}
                      placeholder="Prefix"
                      className="export-dialog__prefix-input"
                    />
                    <span className="export-dialog__preview">
                      → {renamePrefix}001.jpg
                    </span>
                  </div>
                )}
              </div>

              <div className="export-dialog__field">
                <label>File handling</label>
                <div className="export-dialog__radio-group">
                  <label className="export-dialog__radio">
                    <input
                      type="radio"
                      name="fileHandling"
                      value="copy"
                      checked={fileHandling === "copy"}
                      onChange={(e) => setFileHandling(e.target.value)}
                      disabled={isExporting}
                    />
                    Copy (keep originals)
                  </label>
                  <label className="export-dialog__radio">
                    <input
                      type="radio"
                      name="fileHandling"
                      value="move"
                      checked={fileHandling === "move"}
                      onChange={(e) => setFileHandling(e.target.value)}
                      disabled={isExporting}
                    />
                    Move (delete originals)
                  </label>
                </div>
              </div>

              {isExporting && (
                <div className="export-dialog__progress">
                  <div className="export-dialog__progress-bar">
                    <div
                      className="export-dialog__progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="export-dialog__progress-text">
                    Exporting {progress.current} of {progress.total} ({progressPercent}%)
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="export-dialog__footer">
          {result ? (
            <button
              type="button"
              className="export-dialog__btn export-dialog__btn--primary"
              onClick={() => onClose?.()}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="export-dialog__btn"
                onClick={() => onClose?.()}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="export-dialog__btn export-dialog__btn--primary"
                onClick={handleExport}
                disabled={!destination || imageCount === 0 || isExporting}
              >
                {isExporting ? "Exporting..." : `Export ${imageCount} Images`}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
