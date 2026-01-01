import React, { useState, useEffect, useRef, useCallback } from "react";

const MODEL_OPTIONS = [
  {
    id: "qwen3-vl:2b",
    name: "Very Fast (2B)",
    size: "~1.9 GB",
    ram: "4GB+ RAM",
    description: "Quick tagging, lower quality",
  },
  {
    id: "qwen3-vl:4b",
    name: "Fast (4B)",
    size: "~3.3 GB",
    ram: "8GB+ RAM",
    description: "Good for quick tagging",
  },
  {
    id: "qwen3-vl:8b",
    name: "Recommended (8B)",
    size: "~6.1 GB",
    ram: "16GB+ RAM (M1/M2 Mac, RTX 3060+)",
    description: "Best balance of speed and quality",
    recommended: true,
  },
  {
    id: "qwen3-vl:32b",
    name: "Maximum (32B)",
    size: "~20 GB",
    ram: "32GB+ RAM or RTX 4080+",
    description: "Highest quality captions",
  },
];

export default function OllamaSetupDialog({ open, onClose, onSetupComplete }) {
  const dialogRef = useRef(null);
  const [status, setStatus] = useState(null); // null = loading, object = loaded
  const [selectedModel, setSelectedModel] = useState("qwen3-vl:8b");
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(null);
  const [error, setError] = useState(null);

  // Check Ollama status on open
  useEffect(() => {
    if (!open) return;

    setStatus(null);
    setError(null);
    setPullProgress(null);

    const checkStatus = async () => {
      if (!window.electronAPI?.ollama?.check) {
        setStatus({ running: false, error: "API not available" });
        return;
      }

      try {
        const result = await window.electronAPI.ollama.check();
        setStatus(result);

        // If a vision model is already installed, pre-select it
        if (result.installedVisionModels?.length > 0) {
          setSelectedModel(result.installedVisionModels[0].id);
        }
      } catch (err) {
        setStatus({ running: false, error: err.message });
      }
    };

    checkStatus();
  }, [open]);

  // Pull progress listener
  useEffect(() => {
    if (!open || !window.electronAPI?.ollama?.onPullProgress) return undefined;

    const unsubscribe = window.electronAPI.ollama.onPullProgress((progress) => {
      setPullProgress(progress);
    });

    return unsubscribe;
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open || isPulling) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPulling, onClose]);

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

  const handleDownloadModel = useCallback(async () => {
    if (!window.electronAPI?.ollama?.pull) return;

    setIsPulling(true);
    setError(null);
    setPullProgress({ status: "starting", percent: 0 });

    try {
      const result = await window.electronAPI.ollama.pull(selectedModel);

      if (result.success) {
        // Save the selected model to settings
        await window.electronAPI.ollama.setModel(selectedModel);
        onSetupComplete?.(selectedModel);
        onClose?.();
      } else {
        setError(result.error || "Failed to download model");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPulling(false);
    }
  }, [selectedModel, onSetupComplete, onClose]);

  const handleUseExisting = useCallback(async () => {
    if (!window.electronAPI?.ollama?.setModel) return;

    await window.electronAPI.ollama.setModel(selectedModel);
    onSetupComplete?.(selectedModel);
    onClose?.();
  }, [selectedModel, onSetupComplete, onClose]);

  const handleOpenOllamaDownload = useCallback(() => {
    // Open external URL
    window.open("https://ollama.com/download", "_blank");
  }, []);

  if (!open) return null;

  const isLoading = status === null;
  const ollamaRunning = status?.running === true;
  const hasVisionModel = status?.hasVisionModel === true;

  // Format progress for display
  const formatProgress = (progress) => {
    if (!progress) return null;
    if (progress.total > 0) {
      const downloaded = (progress.completed / 1024 / 1024 / 1024).toFixed(1);
      const total = (progress.total / 1024 / 1024 / 1024).toFixed(1);
      return `${downloaded} GB / ${total} GB`;
    }
    return progress.status || "Preparing...";
  };

  return (
    <div
      className="ollama-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPulling) {
          onClose?.();
        }
      }}
    >
      <div
        className="ollama-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ollama-dialog__title"
        ref={dialogRef}
      >
        <header className="ollama-dialog__header">
          <h2 id="ollama-dialog__title">AI Captioning Setup</h2>
        </header>

        <div className="ollama-dialog__body">
          {isLoading ? (
            <div className="ollama-dialog__loading">
              <p>Checking Ollama status...</p>
            </div>
          ) : !ollamaRunning ? (
            // Ollama not running state
            <div className="ollama-dialog__not-running">
              <p className="ollama-dialog__message">
                MediaHive uses Ollama to run AI models locally.
                <br />
                Your images never leave your computer.
              </p>

              <div className="ollama-dialog__warning">
                <strong>Ollama not found.</strong>
                <p>
                  Please download and install Ollama, then restart MediaHive.
                </p>
              </div>

              <button
                type="button"
                className="ollama-dialog__download-btn"
                onClick={handleOpenOllamaDownload}
              >
                Download Ollama
              </button>

              <p className="ollama-dialog__hint">
                After installing, make sure Ollama is running before opening this dialog again.
              </p>
            </div>
          ) : isPulling ? (
            // Downloading model state
            <div className="ollama-dialog__pulling">
              <p className="ollama-dialog__pull-title">
                Downloading {selectedModel}
              </p>

              <div className="ollama-dialog__progress-bar">
                <div
                  className="ollama-dialog__progress-fill"
                  style={{ width: `${pullProgress?.percent || 0}%` }}
                />
              </div>

              <p className="ollama-dialog__progress-text">
                {pullProgress?.percent || 0}% - {formatProgress(pullProgress)}
              </p>

              <p className="ollama-dialog__pull-hint">
                This may take several minutes depending on your internet connection.
                <br />
                Don't close the app.
              </p>

              {error && (
                <p className="ollama-dialog__error">{error}</p>
              )}
            </div>
          ) : (
            // Model selection state
            <>
              <p className="ollama-dialog__message">
                MediaHive uses Ollama to run AI models locally.
                <br />
                Your images never leave your computer.
              </p>

              {!hasVisionModel && (
                <div className="ollama-dialog__size-warning">
                  This will download a large model to your computer.
                </div>
              )}

              <div className="ollama-dialog__models">
                {MODEL_OPTIONS.map((model) => {
                  const isInstalled = status?.installedVisionModels?.some(
                    (m) => m.id === model.id
                  );

                  return (
                    <label
                      key={model.id}
                      className={`ollama-dialog__model ${
                        selectedModel === model.id ? "ollama-dialog__model--selected" : ""
                      } ${isInstalled ? "ollama-dialog__model--installed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isPulling}
                      />
                      <div className="ollama-dialog__model-info">
                        <div className="ollama-dialog__model-header">
                          <span className="ollama-dialog__model-name">
                            {model.name}
                            {model.recommended && (
                              <span className="ollama-dialog__recommended">Recommended</span>
                            )}
                            {isInstalled && (
                              <span className="ollama-dialog__installed">Installed</span>
                            )}
                          </span>
                          <span className="ollama-dialog__model-size">{model.size}</span>
                        </div>
                        <p className="ollama-dialog__model-desc">{model.description}</p>
                        <p className="ollama-dialog__model-ram">Works on: {model.ram}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && (
                <p className="ollama-dialog__error">{error}</p>
              )}
            </>
          )}
        </div>

        <footer className="ollama-dialog__footer">
          {isLoading ? (
            <button
              type="button"
              className="ollama-dialog__btn"
              onClick={() => onClose?.()}
            >
              Cancel
            </button>
          ) : !ollamaRunning ? (
            <button
              type="button"
              className="ollama-dialog__btn"
              onClick={() => onClose?.()}
            >
              Close
            </button>
          ) : isPulling ? (
            <button
              type="button"
              className="ollama-dialog__btn"
              disabled
            >
              Downloading...
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ollama-dialog__btn"
                onClick={() => onClose?.()}
              >
                Cancel
              </button>
              {status?.installedVisionModels?.some((m) => m.id === selectedModel) ? (
                <button
                  type="button"
                  className="ollama-dialog__btn ollama-dialog__btn--primary"
                  onClick={handleUseExisting}
                >
                  Use Selected Model
                </button>
              ) : (
                <button
                  type="button"
                  className="ollama-dialog__btn ollama-dialog__btn--primary"
                  onClick={handleDownloadModel}
                >
                  Download & Install
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
