import React, { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_ENDPOINT = "http://localhost:11434";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

// Detect platform for displaying correct modifier key
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? "⌘" : "Ctrl";

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
// Sub-Modal: Data Management
// ============================================
function DataManagementModal({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [clearing, setClearing] = useState(null); // 'cache' | 'database' | 'recent'

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.dataManagement?.getStats();
      setStats(result);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open, loadStats]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleClearCache = useCallback(async () => {
    const confirmed = window.confirm(
      "Clear thumbnail cache?\n\nThumbnails will be regenerated as needed. This is safe to do."
    );
    if (!confirmed) return;

    setClearing("cache");
    try {
      await window.electronAPI?.dataManagement?.clearCache();
      await loadStats();
    } finally {
      setClearing(null);
    }
  }, [loadStats]);

  const handleClearDatabase = useCallback(async () => {
    const confirmed = window.confirm(
      "Clear metadata database?\n\n⚠️ This will remove all tags, ratings, and AI captions. This cannot be undone."
    );
    if (!confirmed) return;

    setClearing("database");
    try {
      await window.electronAPI?.dataManagement?.clearDatabase();
      await loadStats();
    } finally {
      setClearing(null);
    }
  }, [loadStats]);

  const handleClearRecent = useCallback(async () => {
    setClearing("recent");
    try {
      await window.electronAPI?.recent?.clear();
      await loadStats();
    } finally {
      setClearing(null);
    }
  }, [loadStats]);

  const handleOpenFolder = useCallback(() => {
    window.electronAPI?.dataManagement?.openFolder();
  }, []);

  if (!open) return null;

  return (
    <div className="settings-submodal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-submodal" role="dialog" aria-modal="true">
        <header className="settings-submodal__header">
          <h3>Data Management</h3>
          <button className="settings-submodal__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="settings-submodal__body">
          {loading ? (
            <p className="settings-submodal__muted">Loading...</p>
          ) : (
            <>
              {/* Thumbnail Cache */}
              <div className="data-mgmt__item">
                <div className="data-mgmt__item-info">
                  <span className="data-mgmt__item-title">Thumbnail Cache</span>
                  <span className="data-mgmt__item-detail">
                    {stats?.cache?.count || 0} thumbnails • {formatBytes(stats?.cache?.sizeBytes)}
                  </span>
                </div>
                <button
                  className="settings-submodal__btn-sm"
                  onClick={handleClearCache}
                  disabled={clearing === "cache" || !stats?.cache?.count}
                >
                  {clearing === "cache" ? "Clearing..." : "Clear"}
                </button>
              </div>

              {/* Metadata Database */}
              <div className="data-mgmt__item">
                <div className="data-mgmt__item-info">
                  <span className="data-mgmt__item-title">Metadata Database</span>
                  <span className="data-mgmt__item-detail">
                    Tags, ratings & captions • {formatBytes(stats?.database?.sizeBytes)}
                  </span>
                </div>
                <button
                  className="settings-submodal__btn-sm settings-submodal__btn-sm--danger"
                  onClick={handleClearDatabase}
                  disabled={clearing === "database"}
                >
                  {clearing === "database" ? "Clearing..." : "Clear"}
                </button>
              </div>

              {/* Recent Folders */}
              <div className="data-mgmt__item">
                <div className="data-mgmt__item-info">
                  <span className="data-mgmt__item-title">Recent Folders</span>
                  <span className="data-mgmt__item-detail">
                    {stats?.recentFolders?.count || 0} folders in history
                  </span>
                </div>
                <button
                  className="settings-submodal__btn-sm"
                  onClick={handleClearRecent}
                  disabled={clearing === "recent" || !stats?.recentFolders?.count}
                >
                  {clearing === "recent" ? "Clearing..." : "Clear"}
                </button>
              </div>

              {/* Data Location */}
              <div className="data-mgmt__location">
                <span className="data-mgmt__location-label">Data Location</span>
                <div className="data-mgmt__location-row">
                  <code className="data-mgmt__location-path">{stats?.dataPath || "Unknown"}</code>
                  <button className="settings-submodal__btn-sm" onClick={handleOpenFolder}>
                    Open
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="settings-submodal__footer">
          <button className="settings-submodal__btn settings-submodal__btn--primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}

// ============================================
// Sub-Modal: Keyboard Shortcuts
// ============================================
function KeyboardShortcutsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const shortcuts = [
    { category: "Navigation", items: [
      { keys: "Enter", action: "Open selected in fullscreen" },
      { keys: "Esc", action: "Close fullscreen / dialogs" },
    ]},
    { category: "Selection", items: [
      { keys: `${modKey} + Click`, action: "Toggle item selection" },
      { keys: "Shift + Click", action: "Select range" },
    ]},
    { category: "File Operations", items: [
      { keys: `${modKey} + C`, action: "Copy file path" },
      { keys: "Delete", action: "Move to trash" },
    ]},
    { category: "Zoom", items: [
      { keys: "+ / =", action: "Zoom in" },
      { keys: "-", action: "Zoom out" },
      { keys: `${modKey} + Scroll`, action: "Zoom in/out" },
    ]},
  ];

  return (
    <div className="settings-submodal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-submodal settings-submodal--shortcuts" role="dialog" aria-modal="true">
        <header className="settings-submodal__header">
          <h3>Keyboard Shortcuts</h3>
          <button className="settings-submodal__close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="settings-submodal__body shortcuts-modal__body">
          {shortcuts.map((group) => (
            <div key={group.category} className="shortcuts-modal__group">
              <h4 className="shortcuts-modal__category">{group.category}</h4>
              <div className="shortcuts-modal__list">
                {group.items.map((item, idx) => (
                  <div key={idx} className="shortcuts-modal__item">
                    <kbd className="shortcuts-modal__keys">{item.keys}</kbd>
                    <span className="shortcuts-modal__action">{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
  const [showDataMgmt, setShowDataMgmt] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const anySubModalOpen = showAIConfig || showDataMgmt || showShortcuts || showAbout;

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !anySubModalOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, anySubModalOpen]);

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
      setShowDataMgmt(false);
      setShowShortcuts(false);
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

            <button className="settings-menu__item" onClick={() => setShowDataMgmt(true)}>
              <div className="settings-menu__item-content">
                <span className="settings-menu__item-icon">🗄️</span>
                <div className="settings-menu__item-text">
                  <span className="settings-menu__item-title">Data Management</span>
                  <span className="settings-menu__item-subtitle">Cache, database & storage</span>
                </div>
              </div>
              <span className="settings-menu__item-arrow">›</span>
            </button>

            <button className="settings-menu__item" onClick={() => setShowShortcuts(true)}>
              <div className="settings-menu__item-content">
                <span className="settings-menu__item-icon">⌨️</span>
                <div className="settings-menu__item-text">
                  <span className="settings-menu__item-title">Keyboard Shortcuts</span>
                  <span className="settings-menu__item-subtitle">View all hotkeys</span>
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
      <DataManagementModal
        open={showDataMgmt}
        onClose={() => setShowDataMgmt(false)}
      />
      <KeyboardShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      <AboutModal
        open={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  );
}
