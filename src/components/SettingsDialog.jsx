import React, { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_ENDPOINT = "http://localhost:11434";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export default function SettingsDialog({ open, onClose, onChangeModel }) {
  const dialogRef = useRef(null);
  const [model, setModel] = useState(null);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [editingEndpoint, setEditingEndpoint] = useState(false);
  const [endpointInput, setEndpointInput] = useState(DEFAULT_ENDPOINT);
  const [saving, setSaving] = useState(false);
  const [installedModels, setInstalledModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deletingModel, setDeletingModel] = useState(null);

  // Load settings and installed models on open
  useEffect(() => {
    if (!open) return;

    const loadSettings = async () => {
      if (window.electronAPI?.ollama?.getModel) {
        const savedModel = await window.electronAPI.ollama.getModel();
        setModel(savedModel);
      }
      if (window.electronAPI?.ollama?.getEndpoint) {
        const savedEndpoint = await window.electronAPI.ollama.getEndpoint();
        setEndpoint(savedEndpoint || DEFAULT_ENDPOINT);
        setEndpointInput(savedEndpoint || DEFAULT_ENDPOINT);
      }
    };

    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const status = await window.electronAPI?.ollama?.check();
        if (status?.running && status?.models) {
          // Filter to vision models only
          const visionModels = status.models.filter((m) =>
            m.name.includes("qwen") || m.name.includes("llava") || m.name.includes("vision")
          );
          setInstalledModels(visionModels);
        } else {
          setInstalledModels([]);
        }
      } catch (err) {
        setInstalledModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    loadSettings();
    loadModels();
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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

  const handleChangeModel = useCallback(() => {
    onChangeModel?.();
    onClose?.();
  }, [onChangeModel, onClose]);

  const handleSaveEndpoint = useCallback(async () => {
    if (!window.electronAPI?.ollama?.setEndpoint) return;

    setSaving(true);
    try {
      const result = await window.electronAPI.ollama.setEndpoint(endpointInput);
      if (result.success) {
        setEndpoint(endpointInput);
        setEditingEndpoint(false);
      }
    } finally {
      setSaving(false);
    }
  }, [endpointInput]);

  const handleResetEndpoint = useCallback(() => {
    setEndpointInput(DEFAULT_ENDPOINT);
  }, []);

  const handleDeleteModel = useCallback(async (modelName) => {
    if (!window.electronAPI?.ollama?.delete) return;

    const confirmed = window.confirm(
      `Delete ${modelName}?\n\nThis will remove the model from your computer and free up disk space. You can re-download it later if needed.`
    );

    if (!confirmed) return;

    setDeletingModel(modelName);
    try {
      const result = await window.electronAPI.ollama.delete(modelName);
      if (result.success) {
        // Remove from list
        setInstalledModels((prev) => prev.filter((m) => m.name !== modelName));
        // If this was the active model, clear it
        if (model === modelName) {
          setModel(null);
          await window.electronAPI.ollama.setModel(null);
        }
      }
    } finally {
      setDeletingModel(null);
    }
  }, [model]);

  if (!open) return null;

  const modelDisplayName = model
    ? model.replace("qwen3-vl:", "Qwen3-VL ").toUpperCase()
    : "Not configured";

  return (
    <div
      className="settings-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog__title"
        ref={dialogRef}
      >
        <header className="settings-dialog__header">
          <h2 id="settings-dialog__title">Settings</h2>
        </header>

        <div className="settings-dialog__body">
          <section className="settings-dialog__section">
            <h3 className="settings-dialog__section-title">AI Captioning</h3>

            <div className="settings-dialog__row">
              <div className="settings-dialog__label">Current Model</div>
              <div className="settings-dialog__value">
                <span className={model ? "settings-dialog__model" : "settings-dialog__model--none"}>
                  {modelDisplayName}
                </span>
                <button
                  type="button"
                  className="settings-dialog__btn-small"
                  onClick={handleChangeModel}
                >
                  {model ? "Change Model" : "Setup AI"}
                </button>
              </div>
            </div>

            <div className="settings-dialog__row">
              <div className="settings-dialog__label">
                Ollama Endpoint
                <span className="settings-dialog__label-hint">(Advanced)</span>
              </div>
              <div className="settings-dialog__value">
                {editingEndpoint ? (
                  <div className="settings-dialog__endpoint-edit">
                    <input
                      type="text"
                      value={endpointInput}
                      onChange={(e) => setEndpointInput(e.target.value)}
                      className="settings-dialog__input"
                      placeholder={DEFAULT_ENDPOINT}
                    />
                    <button
                      type="button"
                      className="settings-dialog__btn-small"
                      onClick={handleResetEndpoint}
                      title="Reset to default"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="settings-dialog__btn-small settings-dialog__btn-small--primary"
                      onClick={handleSaveEndpoint}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="settings-dialog__btn-small"
                      onClick={() => {
                        setEndpointInput(endpoint);
                        setEditingEndpoint(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <code className="settings-dialog__endpoint">{endpoint}</code>
                    <button
                      type="button"
                      className="settings-dialog__btn-small"
                      onClick={() => setEditingEndpoint(true)}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="settings-dialog__row settings-dialog__row--models">
              <div className="settings-dialog__label">Installed Models</div>
              <div className="settings-dialog__value settings-dialog__value--models">
                {loadingModels ? (
                  <span className="settings-dialog__loading">Loading models...</span>
                ) : installedModels.length === 0 ? (
                  <span className="settings-dialog__empty">No vision models installed</span>
                ) : (
                  <ul className="settings-dialog__model-list">
                    {installedModels.map((m) => (
                      <li key={m.name} className="settings-dialog__model-item">
                        <div className="settings-dialog__model-info">
                          <span className="settings-dialog__model-name">
                            {m.name}
                            {m.name === model && (
                              <span className="settings-dialog__model-active">(active)</span>
                            )}
                          </span>
                          <span className="settings-dialog__model-size">
                            {formatBytes(m.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="settings-dialog__btn-small settings-dialog__btn-small--danger"
                          onClick={() => handleDeleteModel(m.name)}
                          disabled={deletingModel === m.name}
                        >
                          {deletingModel === m.name ? "Deleting..." : "Delete"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="settings-dialog__footer">
          <button
            type="button"
            className="settings-dialog__btn settings-dialog__btn--primary"
            onClick={() => onClose?.()}
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
