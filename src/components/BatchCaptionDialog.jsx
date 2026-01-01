import React, { useState, useEffect, useRef, useCallback } from "react";

export default function BatchCaptionDialog({
  open,
  onClose,
  files = [],
  model,
  onComplete,
  onUpdateFile,
}) {
  const dialogRef = useRef(null);
  const [options, setOptions] = useState({
    generateCaptions: true,
    generateTags: true,
    overwrite: false,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [results, setResults] = useState({ completed: 0, failed: 0 });
  const [lastCaption, setLastCaption] = useState(null);
  const [error, setError] = useState(null);

  // Filter to images only
  const imageFiles = files.filter((f) => f.mediaType === "image");
  const imageCount = imageFiles.length;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsProcessing(false);
      setProgress(null);
      setBatchId(null);
      setResults({ completed: 0, failed: 0 });
      setLastCaption(null);
      setError(null);
    }
  }, [open]);

  // Progress listener
  useEffect(() => {
    if (!open || !window.electronAPI?.caption?.onBatchProgress) return undefined;

    const unsubscribe = window.electronAPI.caption.onBatchProgress((prog) => {
      setProgress(prog);
      setResults({ completed: prog.completed, failed: prog.failed });

      if (prog.lastResult?.success && prog.lastResult?.caption) {
        setLastCaption({
          name: prog.currentFile,
          caption: prog.lastResult.caption,
          tags: prog.lastResult.tags,
        });
      }

      // Update the file in the main app state if we got a result
      if (prog.lastResult?.success && onUpdateFile) {
        const updates = {
          aiCaption: prog.lastResult.caption,
          aiTags: prog.lastResult.tags,
        };
        // For batch operations, AI tags are auto-saved as regular tags
        if (prog.lastResult.tags?.length > 0) {
          updates.tags = prog.lastResult.tags;
        }
        onUpdateFile(prog.currentPath, updates);
      }
    });

    return unsubscribe;
  }, [open, onUpdateFile]);

  // Escape key handler (only when not processing)
  useEffect(() => {
    if (!open || isProcessing) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isProcessing, onClose]);

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

  const handleStart = useCallback(async () => {
    if (!window.electronAPI?.caption?.batch) return;
    if (!options.generateCaptions && !options.generateTags) {
      setError("Please select at least one option");
      return;
    }

    const newBatchId = `batch-${Date.now()}`;
    setBatchId(newBatchId);
    setIsProcessing(true);
    setError(null);
    setProgress({ current: 0, total: imageCount, percent: 0 });

    // Filter files based on overwrite option
    let filesToProcess = imageFiles;
    if (!options.overwrite) {
      filesToProcess = imageFiles.filter((f) => {
        // Skip files that already have what we're generating
        if (options.generateCaptions && options.generateTags) {
          // Generating both: skip if file has either
          return !f.aiCaption && !f.tags?.length;
        } else if (options.generateCaptions) {
          // Captions only: skip if has caption
          return !f.aiCaption;
        } else if (options.generateTags) {
          // Tags only: skip if has tags
          return !f.tags?.length;
        }
        return true;
      });
    }

    if (filesToProcess.length === 0) {
      setError("All images already have captions/tags. Enable 'Overwrite existing' to regenerate.");
      setIsProcessing(false);
      return;
    }

    try {
      const result = await window.electronAPI.caption.batch(
        filesToProcess.map((f) => ({
          fullPath: f.fullPath,
          name: f.name,
          fingerprint: f.fingerprint,
        })),
        {
          batchId: newBatchId,
          generateCaptions: options.generateCaptions,
          generateTags: options.generateTags,
        }
      );

      if (result.cancelled) {
        // User cancelled, don't close
        setIsProcessing(false);
      } else {
        // Completed
        onComplete?.(result);
        // Don't auto-close, let user see results
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  }, [imageFiles, imageCount, options, onComplete]);

  const handleStop = useCallback(async () => {
    if (!batchId || !window.electronAPI?.caption?.batchCancel) return;
    await window.electronAPI.caption.batchCancel(batchId);
    setIsProcessing(false);
  }, [batchId]);

  const handleClose = useCallback(() => {
    if (isProcessing) {
      handleStop();
    }
    onClose?.();
  }, [isProcessing, handleStop, onClose]);

  if (!open) return null;

  const modelDisplayName = model
    ? model.replace("qwen3-vl:", "Qwen3-VL ").toUpperCase()
    : "Not configured";

  const isComplete = progress && progress.current === progress.total && !isProcessing;

  return (
    <div
      className="batch-caption-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onClose?.();
        }
      }}
    >
      <div
        className="batch-caption-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-caption__title"
        ref={dialogRef}
      >
        <header className="batch-caption__header">
          <h2 id="batch-caption__title">
            {isProcessing
              ? "Captioning in Progress"
              : isComplete
              ? "Captioning Complete"
              : "Batch Caption"}
          </h2>
        </header>

        <div className="batch-caption__body">
          {!isProcessing && !isComplete ? (
            // Setup view
            <>
              <div className="batch-caption__info">
                <div className="batch-caption__row">
                  <span className="batch-caption__label">Source:</span>
                  <span className="batch-caption__value">
                    {imageCount} image{imageCount !== 1 ? "s" : ""} (currently visible)
                  </span>
                </div>
                <div className="batch-caption__row">
                  <span className="batch-caption__label">Model:</span>
                  <span className="batch-caption__value batch-caption__model">
                    {modelDisplayName}
                  </span>
                </div>
              </div>

              <div className="batch-caption__options">
                <label className="batch-caption__option">
                  <input
                    type="checkbox"
                    checked={options.generateCaptions}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, generateCaptions: e.target.checked }))
                    }
                  />
                  <span>Generate detailed captions</span>
                </label>
                <label className="batch-caption__option">
                  <input
                    type="checkbox"
                    checked={options.generateTags}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, generateTags: e.target.checked }))
                    }
                  />
                  <span>Generate tags</span>
                </label>
                <label className="batch-caption__option">
                  <input
                    type="checkbox"
                    checked={options.overwrite}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, overwrite: e.target.checked }))
                    }
                  />
                  <span>Overwrite existing captions</span>
                </label>
              </div>

              <p className="batch-caption__estimate">
                Estimated time: ~{Math.ceil((imageCount * 10) / 60)}-
                {Math.ceil((imageCount * 30) / 60)} minutes
              </p>

              {error && <p className="batch-caption__error">{error}</p>}
            </>
          ) : (
            // Progress view
            <>
              <div className="batch-caption__progress">
                <div className="batch-caption__progress-bar">
                  <div
                    className="batch-caption__progress-fill"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
                <p className="batch-caption__progress-text">
                  {progress?.current || 0}/{progress?.total || imageCount} ({progress?.percent || 0}
                  %)
                </p>
              </div>

              {progress?.currentFile && (
                <p className="batch-caption__current-file">
                  {isProcessing ? "Current: " : "Last: "}
                  {progress.currentFile}
                </p>
              )}

              {lastCaption && (
                <div className="batch-caption__preview">
                  <div className="batch-caption__preview-caption">
                    {lastCaption.caption?.slice(0, 200)}
                    {lastCaption.caption?.length > 200 ? "..." : ""}
                  </div>
                  {lastCaption.tags && lastCaption.tags.length > 0 && (
                    <div className="batch-caption__preview-tags">
                      {lastCaption.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="batch-caption__tag">
                          {tag}
                        </span>
                      ))}
                      {lastCaption.tags.length > 5 && (
                        <span className="batch-caption__tag-more">
                          +{lastCaption.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="batch-caption__stats">
                <span className="batch-caption__stat batch-caption__stat--success">
                  {results.completed} completed
                </span>
                {results.failed > 0 && (
                  <span className="batch-caption__stat batch-caption__stat--failed">
                    {results.failed} failed
                  </span>
                )}
              </div>

              {error && <p className="batch-caption__error">{error}</p>}
            </>
          )}
        </div>

        <footer className="batch-caption__footer">
          {!isProcessing && !isComplete ? (
            <>
              <button
                type="button"
                className="batch-caption__btn"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="batch-caption__btn batch-caption__btn--primary"
                onClick={handleStart}
                disabled={imageCount === 0 || !model}
              >
                Start Caption
              </button>
            </>
          ) : isProcessing ? (
            <button
              type="button"
              className="batch-caption__btn batch-caption__btn--danger"
              onClick={handleStop}
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="batch-caption__btn batch-caption__btn--primary"
              onClick={handleClose}
            >
              Done
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
