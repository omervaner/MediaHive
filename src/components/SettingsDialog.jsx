import React, { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_ENDPOINT = "http://localhost:11434";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// ============================================
// Sub-Modal: AI Captioning Configuration
// ============================================
function AICaptioningModal({ open, onClose, onChangeModel }) {
  const dialogRef = useRef(null);
  const [model, setModel] = useState(null);
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [editingEndpoint, setEditingEndpoint] = useState(false);
  const [endpointInput, setEndpointInput] = useState(DEFAULT_ENDPOINT);
  const [saving, setSaving] = useState(false);
  const [installedModels, setInstalledModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deletingModel, setDeletingModel] = useState(null);

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

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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

  const handleDeleteModel = useCallback(async (modelName) => {
    if (!window.electronAPI?.ollama?.delete) return;
    const confirmed = window.confirm(
      `Delete ${modelName}?\n\nThis will remove the model from your computer. You can re-download it later.`
    );
    if (!confirmed) return;

    setDeletingModel(modelName);
    try {
      const result = await window.electronAPI.ollama.delete(modelName);
      if (result.success) {
        setInstalledModels((prev) => prev.filter((m) => m.name !== modelName));
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
    <div className="settings-submodal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-submodal" ref={dialogRef} role="dialog" aria-modal="true">
        <header className="settings-submodal__header">
          <h3>AI Captioning</h3>
          <button className="settings-submodal__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="settings-submodal__body">
          {/* Current Model */}
          <div className="settings-submodal__row">
            <span className="settings-submodal__label">Current Model</span>
            <div className="settings-submodal__value">
              <span className={model ? "settings-submodal__model-name" : "settings-submodal__model-name--none"}>
                {modelDisplayName}
              </span>
              <button className="settings-submodal__btn-sm" onClick={handleChangeModel}>
                {model ? "Change" : "Setup"}
              </button>
            </div>
          </div>

          {/* Endpoint */}
          <div className="settings-submodal__row">
            <span className="settings-submodal__label">
              Ollama Endpoint <span className="settings-submodal__hint">(Advanced)</span>
            </span>
            {editingEndpoint ? (
              <div className="settings-submodal__endpoint-edit">
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => setEndpointInput(e.target.value)}
                  className="settings-submodal__input"
                  placeholder={DEFAULT_ENDPOINT}
                />
                <div className="settings-submodal__endpoint-actions">
                  <button className="settings-submodal__btn-sm" onClick={() => setEndpointInput(DEFAULT_ENDPOINT)}>Reset</button>
                  <button className="settings-submodal__btn-sm settings-submodal__btn-sm--primary" onClick={handleSaveEndpoint} disabled={saving}>
                    {saving ? "..." : "Save"}
                  </button>
                  <button className="settings-submodal__btn-sm" onClick={() => { setEndpointInput(endpoint); setEditingEndpoint(false); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-submodal__value">
                <code className="settings-submodal__endpoint">{endpoint}</code>
                <button className="settings-submodal__btn-sm" onClick={() => setEditingEndpoint(true)}>Edit</button>
              </div>
            )}
          </div>

          {/* Installed Models */}
          <div className="settings-submodal__section">
            <span className="settings-submodal__label">Installed Models</span>
            {loadingModels ? (
              <p className="settings-submodal__muted">Loading...</p>
            ) : installedModels.length === 0 ? (
              <p className="settings-submodal__muted">No vision models installed</p>
            ) : (
              <ul className="settings-submodal__model-list">
                {installedModels.map((m) => (
                  <li key={m.name} className="settings-submodal__model-item">
                    <div className="settings-submodal__model-info">
                      <span className="settings-submodal__model-title">
                        {m.name}
                        {m.name === model && <span className="settings-submodal__active-badge">active</span>}
                      </span>
                      <span className="settings-submodal__model-size">{formatBytes(m.size)}</span>
                    </div>
                    <button
                      className="settings-submodal__btn-sm settings-submodal__btn-sm--danger"
                      onClick={() => handleDeleteModel(m.name)}
                      disabled={deletingModel === m.name}
                    >
                      {deletingModel === m.name ? "..." : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="settings-submodal__footer">
          <button className="settings-submodal__btn settings-submodal__btn--primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

// ============================================
// Sub-Modal: About
// ============================================
function AboutModal({ open, onClose }) {
  const [version, setVersion] = useState("0.7.0");

  useEffect(() => {
    if (!open) return;
    window.electronAPI?.getAppVersion?.().then((v) => {
      if (v) setVersion(v);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-submodal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-submodal settings-submodal--about" role="dialog" aria-modal="true">
        <header className="settings-submodal__header">
          <h3>About</h3>
          <button className="settings-submodal__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="settings-submodal__body settings-submodal__body--about">
          <div className="about-modal__app">
            <span className="about-modal__name">MediaHive</span>
            <span className="about-modal__version">v{version}</span>
          </div>

          <p className="about-modal__description">
            Media browser with AI captioning for LoRA training
          </p>

          <div className="about-modal__links">
            <button
              className="about-modal__link-btn"
              onClick={() => window.electronAPI?.openExternal?.("https://github.com/omervaner/MediaHive")}
            >
              <span className="about-modal__link-icon">⌘</span>
              GitHub Repository
            </button>
          </div>

          <div className="about-modal__tech">
            <span className="about-modal__tech-label">Built with</span>
            <span className="about-modal__tech-list">Electron • React • Ollama • Sharp</span>
          </div>
        </div>

        <footer className="settings-submodal__footer">
          <button className="settings-submodal__btn settings-submodal__btn--primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}

// ============================================
// Main Settings Dialog
// ============================================
export default function SettingsDialog({ open, onClose, onChangeModel }) {
  const dialogRef = useRef(null);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !showAIConfig && !showAbout) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showAIConfig, showAbout]);

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

  // Reset sub-modals when main dialog closes
  useEffect(() => {
    if (!open) {
      setShowAIConfig(false);
      setShowAbout(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="settings-dialog-backdrop"
        role="presentation"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div
          className="settings-dialog settings-dialog--compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-dialog__title"
          ref={dialogRef}
        >
          <header className="settings-dialog__header">
            <h2 id="settings-dialog__title">Settings</h2>
          </header>

          <div className="settings-dialog__body settings-dialog__body--menu">
            <button className="settings-menu__item" onClick={() => setShowAIConfig(true)}>
              <div className="settings-menu__item-content">
                <span className="settings-menu__item-icon">🤖</span>
                <div className="settings-menu__item-text">
                  <span className="settings-menu__item-title">AI Captioning</span>
                  <span className="settings-menu__item-subtitle">Model configuration & management</span>
                </div>
              </div>
              <span className="settings-menu__item-arrow">›</span>
            </button>

            <button className="settings-menu__item" onClick={() => setShowAbout(true)}>
              <div className="settings-menu__item-content">
                <span className="settings-menu__item-icon">ℹ️</span>
                <div className="settings-menu__item-text">
                  <span className="settings-menu__item-title">About</span>
                  <span className="settings-menu__item-subtitle">Version info & links</span>
                </div>
              </div>
              <span className="settings-menu__item-arrow">›</span>
            </button>
          </div>

          <footer className="settings-dialog__footer settings-dialog__footer--spaced">
            <button
              type="button"
              className="settings-dialog__btn settings-dialog__btn--exit"
              onClick={() => window.electronAPI?.quitApp?.()}
            >
              Exit App
            </button>
            <button
              type="button"
              className="settings-dialog__btn settings-dialog__btn--primary"
              onClick={onClose}
            >
              Done
            </button>
          </footer>
        </div>
      </div>

      {/* Sub-modals */}
      <AICaptioningModal
        open={showAIConfig}
        onClose={() => setShowAIConfig(false)}
        onChangeModel={onChangeModel}
      />
      <AboutModal
        open={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  );
}
