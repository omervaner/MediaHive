const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const { shell } = require("electron");

const { getVideoDimensions } = require("./videoDimensions");
const { getImageDimensions } = require("./imageDimensions");
const { detectScreenshot } = require("./screenshotDetector");
const { createFolderWatcher } = require("./watcher");

let deps = null;

// Supported media file extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv', '.3gp', '.ogv'];
const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

// We keep scanFolderForChanges so the watcher module can call it in polling mode.
let lastFolderScan = new Map();

function ensureInit() {
  if (!deps) {
    throw new Error("main/ipc-files.js used before init()");
  }
  return deps;
}

// Helper functions to check file types
function isVideoFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

function isImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function isMediaFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return MEDIA_EXTENSIONS.includes(ext);
}

// Helper function to format file sizes
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper function to create rich file object
async function createVideoFileObject(filePath, baseFolderPath) {
  const { getStore } = ensureInit();
  try {
    const stats = await fsPromises.stat(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    let dirname = path.relative(baseFolderPath, path.dirname(filePath));
    if (dirname === ".") dirname = "";

    let fingerprint = null;
    let tags = [];
    let rating = null;
    let dimensions = null;
    let aiCaption = null;
    let aiTags = null;

    const isValidDimensions = (dims) =>
      dims && Number.isFinite(dims.width) && Number.isFinite(dims.height) && dims.width > 0 && dims.height > 0;

    try {
      const metadataStore = getStore();
      const info = await metadataStore.indexFile({ filePath, stats });
      fingerprint = info?.fingerprint ?? null;
      tags = Array.isArray(info?.tags) ? info.tags : [];
      rating =
        typeof info?.rating === "number" && Number.isFinite(info.rating)
          ? info.rating
          : null;
      aiCaption = info?.aiCaption ?? null;
      aiTags = Array.isArray(info?.aiTags) ? info.aiTags : null;

      // Debug: log if caption data exists
      if (aiCaption || aiTags) {
        console.log("[DEBUG] Loaded caption data for", path.basename(filePath), {
          fingerprint: fingerprint?.slice(0, 20),
          captionLength: aiCaption?.length,
          tagsCount: aiTags?.length,
        });
      }

      if (isValidDimensions(info?.dimensions)) {
        dimensions = info.dimensions;
      } else if (fingerprint) {
        const storedDims = metadataStore.getDimensions(fingerprint);
        if (isValidDimensions(storedDims)) {
          dimensions = storedDims;
        }
      }

      // Compute dimensions if not cached
      if (!isValidDimensions(dimensions)) {
        const computed = isImageFile(filePath)
          ? await getImageDimensions(filePath, stats)
          : await getVideoDimensions(filePath, stats);
        if (isValidDimensions(computed)) {
          dimensions = computed;
          if (fingerprint) {
            metadataStore.setDimensions(fingerprint, computed);
          }
        }
      }
    } catch (metaError) {
      console.warn(
        `[metadata] Failed to index ${filePath}:`,
        metaError?.message || metaError
      );
    }

    // Detect screenshots for images
    const isImage = isImageFile(filePath);
    let screenshotInfo = { isScreenshot: false, confidence: 0 };
    if (isImage && dimensions) {
      screenshotInfo = detectScreenshot(filePath, dimensions, fileName);
    }

    return {
      id: filePath,
      name: fileName,
      fullPath: filePath,
      relativePath: path.relative(baseFolderPath, filePath),
      extension: ext,
      mediaType: isImage ? 'image' : 'video',
      size: stats.size,
      dateModified: stats.mtime,
      dateCreated: stats.birthtime,
      isElectronFile: true,
      basename: fileName,
      dirname,
      createdMs: stats.birthtimeMs || stats.ctimeMs || stats.mtimeMs,
      fingerprint,
      tags,
      rating,
      aiCaption,
      aiTags,
      isScreenshot: screenshotInfo.isScreenshot,
      screenshotConfidence: screenshotInfo.confidence,
      dimensions: dimensions
        ? {
          width: Math.round(dimensions.width),
          height: Math.round(dimensions.height),
          aspectRatio:
            Number.isFinite(dimensions.aspectRatio) && dimensions.aspectRatio > 0
              ? dimensions.aspectRatio
              : dimensions.width / dimensions.height,
        }
        : null,
      aspectRatio:
        dimensions && isValidDimensions(dimensions)
          ? (Number.isFinite(dimensions.aspectRatio) && dimensions.aspectRatio > 0
            ? dimensions.aspectRatio
            : dimensions.width / dimensions.height)
          : null,
      metadata: {
        folder: path.dirname(filePath),
        baseName: path.basename(fileName, ext),
        sizeFormatted: formatFileSize(stats.size),
        dateModifiedFormatted: stats.mtime.toLocaleDateString(),
        dateCreatedFormatted: stats.birthtime.toLocaleDateString(),
      },
    };
  } catch (error) {
    console.warn(`Error creating file object for ${filePath}:`, error.message);
    return null;
  }
}

// Scan folder and detect changes (used by watcher in polling mode)
async function scanFolderForChanges(folderPath, options = {}) {
  const { getMainWindow } = ensureInit();
  const { recursive = true } = options;
  try {
    const currentFiles = new Map();

    async function scanDirectory(dirPath, depth = 0) {
      if (!recursive && depth > 0) return;
      if (recursive && depth > 10) return; // Limit depth when recursing
      const files = await fsPromises.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);

        if (file.isFile()) {
          if (isMediaFile(file.name)) {
            try {
              const stats = await fsPromises.stat(fullPath);
              currentFiles.set(fullPath, {
                size: stats.size,
                mtime: stats.mtime.getTime(),
              });
            } catch {
              // File might have been deleted while scanning
            }
          }
        } else if (
          recursive &&
          file.isDirectory() &&
          depth < 10 &&
          !file.name.startsWith(".")
        ) {
          await scanDirectory(fullPath, depth + 1);
        }
      }
    }

    await scanDirectory(folderPath);

    const mainWindow = getMainWindow();
    if (lastFolderScan.size > 0 && mainWindow && !mainWindow.isDestroyed()) {
      // Added/changed
      for (const [filePath, fileInfo] of currentFiles) {
        if (!lastFolderScan.has(filePath)) {
          try {
            const videoFile = await createVideoFileObject(filePath, folderPath);
            if (videoFile) {
              mainWindow.webContents.send("file-added", videoFile);
            }
          } catch (e) {
            // File may have been deleted between scan and now
            if (e.code !== "ENOENT") {
              console.warn("[polling:add] Error:", e.message);
            }
          }
        } else {
          const lastInfo = lastFolderScan.get(filePath);
          if (
            lastInfo.mtime !== fileInfo.mtime ||
            lastInfo.size !== fileInfo.size
          ) {
            try {
              const videoFile = await createVideoFileObject(filePath, folderPath);
              if (videoFile) {
                mainWindow.webContents.send("file-changed", videoFile);
              }
            } catch (e) {
              // File may have been deleted - send removal
              if (e.code === "ENOENT") {
                mainWindow.webContents.send("file-removed", filePath);
              } else {
                console.warn("[polling:change] Error:", e.message);
              }
            }
          }
        }
      }
      // Removed
      for (const filePath of lastFolderScan.keys()) {
        if (!currentFiles.has(filePath)) {
          mainWindow.webContents.send("file-removed", filePath);
        }
      }
    }

    lastFolderScan = currentFiles;
  } catch (error) {
    console.error("Error in polling mode scan:", error);
  }
}

// Instantiate watcher (single instance, logic in ./watcher.js)
const folderWatcher = createFolderWatcher({
  isVideoFile: isMediaFile, // Now accepts both images and videos
  createVideoFileObject,
  scanFolderForChanges,
  logger: console,
  depth: 10, // unchanged from your previous config
});

// Wire watcher events to the renderer (native watch mode)
function wireWatcherEvents() {
  const { getMainWindow } = ensureInit();
  folderWatcher.on("added", (videoFile) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("file-added", videoFile);
  });
  folderWatcher.on("removed", (filePath) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("file-removed", filePath);
  });
  folderWatcher.on("changed", (videoFile) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("file-changed", videoFile);
  });
  folderWatcher.on("mode", ({ mode, folderPath }) => {
    console.log(`[watch] mode=${mode} path=${folderPath}`);
    // Optionally notify the renderer:
    // win.webContents.send("file-watch-mode", mode);
  });
  folderWatcher.on("error", (err) => {
    const msg = (err && err.message) || String(err);
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("file-watch-error", msg);
  });
  folderWatcher.on("ready", ({ folderPath }) => {
    console.log("Started watching folder:", folderPath);
  });
}

async function stopWatcher() {
  await folderWatcher.stop();
}

function resetScanState() {
  lastFolderScan = new Map();
}

function init(receivedDeps) {
  deps = receivedDeps;
  const { ipcMain, dialog, getMainWindow } = deps;

  wireWatcherEvents();

  ipcMain.handle("select-folder", async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        properties: ["openDirectory"],
        title: "Select Video Folder",
      });

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, folderPath: result.filePaths[0] };
      } else {
        return { success: false, canceled: true };
      }
    } catch (error) {
      console.error("Error showing folder dialog:", error);
      return { success: false, error: error.message };
    }
  });

  // Handle file manager opening
  ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
    try {
      console.log("Attempting to show in folder:", filePath);
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error("Failed to show item in folder:", error);
      return { success: false, error: error.message };
    }
  });

  // Open file in external application (default video player)
  ipcMain.handle("open-in-external-player", async (_event, filePath) => {
    try {
      console.log("Opening in external player:", filePath);
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      console.error("Failed to open in external player:", error);
      return { success: false, error: error.message };
    }
  });

  // Read directory and return media files with metadata
  ipcMain.handle(
    "read-directory",
    async (_event, folderPath, recursive = false) => {
      try {
        console.log(`Reading directory: ${folderPath} (recursive: ${recursive})`);
        const mediaFiles = [];

        async function scanDirectory(dirPath, depth = 0) {
          const files = await fsPromises.readdir(dirPath, { withFileTypes: true });

          for (const file of files) {
            const fullPath = path.join(dirPath, file.name);

            if (file.isFile()) {
              if (isMediaFile(file.name)) {
                try {
                  const videoFile = await createVideoFileObject(
                    fullPath,
                    folderPath
                  );
                  if (videoFile) {
                    mediaFiles.push(videoFile);
                  }
                } catch (error) {
                  console.warn(
                    `Error reading file stats for ${fullPath}:`,
                    error.message
                  );
                }
              }
            } else if (file.isDirectory() && recursive && depth < 10) {
              if (
                !file.name.startsWith(".") &&
                ![
                  "node_modules",
                  "System Volume Information",
                  "$RECYCLE.BIN",
                  ".git",
                ].includes(file.name)
              ) {
                try {
                  await scanDirectory(fullPath, depth + 1);
                } catch (error) {
                  console.warn(
                    `Skipping directory ${fullPath}: ${error.message}`
                  );
                }
              }
            }
          }
        }

        await scanDirectory(folderPath);

        console.log(
          `Found ${mediaFiles.length} media files in ${folderPath} (recursive: ${recursive})`
        );

        return mediaFiles.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error("Error reading directory:", error);
        throw error;
      }
    }
  );

  // File info helpers
  ipcMain.handle("get-file-info", async (_event, filePath) => {
    try {
      const stats = await fsPromises.stat(filePath);
      return {
        name: path.basename(filePath),
        size: stats.size,
        isFile: stats.isFile(),
        path: filePath,
      };
    } catch (error) {
      console.error("Error getting file info:", error);
      return null;
    }
  });

  ipcMain.handle("copy-file", async (_event, sourcePath, destPath) => {
    try {
      await fsPromises.copyFile(sourcePath, destPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-file-properties", async (_event, filePath) => {
    try {
      const stats = await fsPromises.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        permissions: stats.mode,
      };
    } catch {
      return null;
    }
  });

  // Watcher IPC (delegated to file watcher module)
  ipcMain.handle("start-folder-watch", async (_event, folderPath, recursive) => {
    try {
      const result = await folderWatcher.start(folderPath, {
        recursive: recursive ?? true,
      });
      return {
        success: true,
        mode: result.mode,
        recursive: result.recursive,
      };
    } catch (e) {
      console.error("Error starting folder watch:", e);
      return { success: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle("stop-folder-watch", async () => {
    try {
      await folderWatcher.stop();
      lastFolderScan.clear();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  });
}

module.exports = {
  init,
  stopWatcher,
  resetScanState,
};
