// main/fileOperations.js
// Copy/Move files with optional rename

const fs = require("fs");
const path = require("path");

/**
 * Copy or move files to a destination folder
 * @param {Object} options
 * @param {Array} options.files - Array of { sourcePath, newName }
 * @param {string} options.destination - Destination folder path
 * @param {string} options.mode - 'copy' or 'move'
 * @param {Function} options.onProgress - Progress callback (current, total)
 * @returns {Promise<{success: boolean, processed: number, errors: string[]}>}
 */
async function copyMoveFiles({ files, destination, mode = "copy", onProgress }) {
  const errors = [];
  let processed = 0;
  const total = files.length;

  // Ensure destination exists
  if (!fs.existsSync(destination)) {
    try {
      fs.mkdirSync(destination, { recursive: true });
    } catch (err) {
      return { success: false, error: `Failed to create destination: ${err.message}` };
    }
  }

  for (let i = 0; i < files.length; i++) {
    const { sourcePath, newName } = files[i];
    const destPath = path.join(destination, newName);

    try {
      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        errors.push(`Source not found: ${sourcePath}`);
        continue;
      }

      // Check if destination already exists
      if (fs.existsSync(destPath)) {
        // Generate unique name
        const ext = path.extname(newName);
        const base = path.basename(newName, ext);
        let counter = 1;
        let uniquePath = destPath;
        while (fs.existsSync(uniquePath)) {
          uniquePath = path.join(destination, `${base}_${counter}${ext}`);
          counter++;
        }
        
        if (mode === "copy") {
          fs.copyFileSync(sourcePath, uniquePath);
        } else {
          fs.renameSync(sourcePath, uniquePath);
        }
      } else {
        if (mode === "copy") {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          // Try rename first (fast if same filesystem)
          try {
            fs.renameSync(sourcePath, destPath);
          } catch (renameErr) {
            // Cross-filesystem move: copy then delete
            fs.copyFileSync(sourcePath, destPath);
            fs.unlinkSync(sourcePath);
          }
        }
      }

      processed++;
      if (onProgress) {
        onProgress({ current: processed, total });
      }
    } catch (err) {
      errors.push(`${path.basename(sourcePath)}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0 || processed > 0,
    processed,
    errors,
  };
}

/**
 * Open folder picker dialog
 * @param {BrowserWindow} parentWindow
 * @returns {Promise<string|null>}
 */
async function pickFolder(parentWindow) {
  const { dialog } = require("electron");
  
  const result = await dialog.showOpenDialog(parentWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Select Destination Folder",
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  return result.filePaths[0];
}

module.exports = {
  copyMoveFiles,
  pickFolder,
};
