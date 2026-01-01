import React, { useState, useEffect, useRef, useCallback } from "react";

const RENAME_OPTIONS = [
  { value: "none", label: "Keep original names" },
  { value: "prefix", label: "Add prefix + sequence" },
  { value: "replace", label: "Find and replace" },
];

export default function MoveDialog({ 
  open, 
  onClose, 
  files = [], 
  mode = "copy", // 'copy' or 'move'
  onComplete 
}) {
  const dialogRef = useRef(null);
  const [destination, setDestination] = useState("");
  const [renameOption, setRenameOption] = useState("none");
  const [prefix, setPrefix] = useState("");
  const [startNumber, setStartNumber] = useState(1);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  const fileCount = files.length;
  const title = mode === "move" ? "Move Files" : "Copy Files";

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDestination("");
      setRenameOption("none");
      setPrefix("");
      setStartNumber(1);
      setFindText("");
      setReplaceText("");
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
      setResult(null);
    }
  }, [open]);

  // Escape key handler
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

  // Progress listener
  useEffect(() => {
    if (!open || !window.electronAPI?.fileOps?.onProgress) return undefined;
    const unsubscribe = window.electronAPI.fileOps.onProgress((prog) => {
      setProgress(prog);
    });
    return unsubscribe;
  }, [open]);

  const handlePickFolder = useCallback(async () => {
    if (!window.electronAPI?.fileOps?.pickFolder) return;
    const folder = await window.electronAPI.fileOps.pickFolder();
    if (folder) {
      setDestination(folder);
    }
  }, []);

  // Generate new filename based on options
  const getNewFilename = useCallback((originalName, index) => {
    if (renameOption === "none") {
      return originalName;
    }
    
    if (renameOption === "prefix") {
      const ext = originalName.substring(originalName.lastIndexOf("."));
      const num = String(startNumber + index).padStart(3, "0");
      return `${prefix}${num}${ext}`;
    }
    
    if (renameOption === "replace" && findText) {
      return originalName.split(findText).join(replaceText);
    }
    
    return originalName;
  }, [renameOption, prefix, startNumber, findText, replaceText]);

  // Preview filenames
  const previewFiles = files.slice(0, 3).map((f, i) => ({
    original: f.name,
    renamed: getNewFilename(f.name, i),
  }));

  const handleExecute = useCallback(async () => {
    if (!destination || fileCount === 0) return;
    if (!window.electronAPI?.fileOps?.copyMove) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: fileCount });
    setResult(null);

    try {
      const fileList = files.map((f, i) => ({
        sourcePath: f.fullPath,
        newName: getNewFilename(f.name, i),
      }));

      const res = await window.electronAPI.fileOps.copyMove({
        files: fileList,
        destination,
        mode, // 'copy' or 'move'
      });

      setResult(res);
      
      if (res.success && mode === "move" && onComplete) {
        // Notify parent about moved files so they can be removed from view
        onComplete({ 
          mode, 
          movedFiles: files.map(f => f.fullPath),
          destination 
        });
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [destination, fileCount, files, getNewFilename, mode, onComplete]);

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
      className="move-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onClose?.();
        }
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        className="move-dialog"
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          width: "500px",
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        }}
      >
        <header style={{
          padding: "16px 20px",
          borderBottom: "1px solid #3d3d3d",
          backgroundColor: "#252525",
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>
            {title}
          </h2>
        </header>

        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {result ? (
            <div>
              {result.success ? (
                <>
                  <p style={{ color: "#FBBF24", marginBottom: "12px" }}>
                    ✅ Successfully {mode === "move" ? "moved" : "copied"} {result.processed} files
                  </p>
                  <p style={{ color: "#888", fontSize: "13px" }}>
                    Destination: {destination}
                  </p>
                  {result.errors?.length > 0 && (
                    <details style={{ marginTop: "12px", color: "#ff6b6b" }}>
                      <summary>{result.errors.length} errors occurred</summary>
                      <ul style={{ fontSize: "12px", marginTop: "8px" }}>
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <button
                    onClick={handleOpenFolder}
                    style={{
                      marginTop: "16px",
                      padding: "8px 16px",
                      backgroundColor: "#F59E0B",
                      color: "#422006",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Open Folder
                  </button>
                </>
              ) : (
                <p style={{ color: "#ff6b6b" }}>
                  ❌ Operation failed: {result.error}
                </p>
              )}
            </div>
          ) : (
            <>
              <p style={{ color: "#ddd", marginBottom: "16px" }}>
                {mode === "move" ? "Moving" : "Copying"} <strong>{fileCount}</strong> {fileCount === 1 ? "file" : "files"}
              </p>

              {/* Destination */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                  Destination Folder
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={destination}
                    readOnly
                    placeholder="No folder selected"
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      backgroundColor: "#1e1e1e",
                      border: "1px solid #3d3d3d",
                      borderRadius: "6px",
                      color: "#ddd",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    onClick={handlePickFolder}
                    disabled={isProcessing}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "#3d3d3d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Browse...
                  </button>
                </div>
              </div>

              {/* Rename options */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                  Rename Files
                </label>
                <select
                  value={renameOption}
                  onChange={(e) => setRenameOption(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor: "#1e1e1e",
                    border: "1px solid #3d3d3d",
                    borderRadius: "6px",
                    color: "#ddd",
                    fontSize: "13px",
                  }}
                >
                  {RENAME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prefix options */}
              {renameOption === "prefix" && (
                <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="e.g., photo_"
                      disabled={isProcessing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #3d3d3d",
                        borderRadius: "6px",
                        color: "#ddd",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                      Start #
                    </label>
                    <input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      min={1}
                      disabled={isProcessing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #3d3d3d",
                        borderRadius: "6px",
                        color: "#ddd",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Find/Replace options */}
              {renameOption === "replace" && (
                <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                      Find
                    </label>
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="Text to find"
                      disabled={isProcessing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #3d3d3d",
                        borderRadius: "6px",
                        color: "#ddd",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", color: "#aaa", marginBottom: "6px", fontSize: "13px" }}>
                      Replace with
                    </label>
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="Replacement text"
                      disabled={isProcessing}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        backgroundColor: "#1e1e1e",
                        border: "1px solid #3d3d3d",
                        borderRadius: "6px",
                        color: "#ddd",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {renameOption !== "none" && previewFiles.length > 0 && (
                <div style={{ 
                  marginBottom: "16px", 
                  padding: "12px",
                  backgroundColor: "#1e1e1e",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}>
                  <div style={{ color: "#888", marginBottom: "8px" }}>Preview:</div>
                  {previewFiles.map((f, i) => (
                    <div key={i} style={{ color: "#aaa", marginBottom: "4px" }}>
                      <span style={{ color: "#666" }}>{f.original}</span>
                      <span style={{ color: "#F59E0B" }}> → </span>
                      <span style={{ color: "#FBBF24" }}>{f.renamed}</span>
                    </div>
                  ))}
                  {fileCount > 3 && (
                    <div style={{ color: "#666", marginTop: "4px" }}>
                      ...and {fileCount - 3} more
                    </div>
                  )}
                </div>
              )}

              {/* Progress */}
              {isProcessing && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{
                    height: "8px",
                    backgroundColor: "#1e1e1e",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      backgroundColor: "#F59E0B",
                      transition: "width 0.2s ease",
                    }} />
                  </div>
                  <p style={{ color: "#888", fontSize: "12px", marginTop: "8px" }}>
                    {mode === "move" ? "Moving" : "Copying"} {progress.current} of {progress.total}...
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <footer style={{
          padding: "16px 20px",
          borderTop: "1px solid #3d3d3d",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
        }}>
          {result ? (
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                backgroundColor: "#F59E0B",
                color: "#422006",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isProcessing}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#3d3d3d",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!destination || fileCount === 0 || isProcessing}
                style={{
                  padding: "10px 20px",
                  backgroundColor: (!destination || isProcessing) ? "#666" : "#F59E0B",
                  color: (!destination || isProcessing) ? "#999" : "#422006",
                  border: "none",
                  borderRadius: "6px",
                  cursor: (!destination || isProcessing) ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {isProcessing 
                  ? `${mode === "move" ? "Moving" : "Copying"}...` 
                  : `${mode === "move" ? "Move" : "Copy"} ${fileCount} ${fileCount === 1 ? "File" : "Files"}`}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
