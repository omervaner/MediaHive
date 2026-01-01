const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

/**
 * Export dataset for LoRA training
 * @param {object} options
 * @param {Array} options.files - Array of file objects to export
 * @param {string} options.destination - Target folder path
 * @param {boolean} options.includeCaptions - Create .txt caption files
 * @param {string} options.captionSource - 'tags' or 'ai' (ai not implemented yet)
 * @param {object|null} options.resize - { shortEdge: number } or null
 * @param {object|null} options.rename - { prefix: string } or null
 * @param {string} options.fileHandling - 'copy' or 'move'
 * @param {function} options.onProgress - Progress callback (current, total)
 * @returns {Promise<{ exported: number, destination: string, errors: string[] }>}
 */
async function exportDataset(options) {
  const {
    files,
    destination,
    includeCaptions = false,
    captionSource = "tags",
    resize = null,
    rename = null,
    fileHandling = "copy",
    onProgress = () => {},
  } = options;

  const errors = [];
  let exported = 0;

  // Create destination folder
  await fs.promises.mkdir(destination, { recursive: true });

  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const sourcePath = file.fullPath;

    try {
      // Determine new filename
      let newName;
      if (rename && rename.prefix) {
        const ext = path.extname(file.name).toLowerCase();
        const index = String(i + 1).padStart(3, "0");
        newName = `${rename.prefix}${index}${ext}`;
      } else {
        newName = file.name;
      }

      const destPath = path.join(destination, newName);

      // Handle image (resize or copy/move)
      if (resize && resize.shortEdge) {
        // Resize with sharp
        const metadata = await sharp(sourcePath).metadata();
        const { width, height } = metadata;
        const shortEdge = Math.min(width, height);
        const longEdge = Math.max(width, height);
        const targetShort = resize.shortEdge;

        // Only resize if image is larger than target
        if (shortEdge > targetShort) {
          const scale = targetShort / shortEdge;
          const newWidth = width <= height ? targetShort : Math.round(longEdge * scale);
          const newHeight = height <= width ? targetShort : Math.round(longEdge * scale);

          await sharp(sourcePath)
            .rotate() // Auto-rotate based on EXIF
            .resize(newWidth, newHeight, { fit: "inside" })
            .toFile(destPath);
        } else {
          // Image is smaller than target, just copy
          await fs.promises.copyFile(sourcePath, destPath);
        }

        // If move was requested and we resized, delete source
        if (fileHandling === "move") {
          await fs.promises.unlink(sourcePath);
        }
      } else {
        // No resize - copy or move
        if (fileHandling === "move") {
          await fs.promises.rename(sourcePath, destPath);
        } else {
          await fs.promises.copyFile(sourcePath, destPath);
        }
      }

      // Create caption file if requested
      if (includeCaptions) {
        const captionPath = destPath.replace(/\.[^.]+$/, ".txt");
        let captionContent = "";

        if (captionSource === "tags" && Array.isArray(file.tags)) {
          captionContent = file.tags.join(", ");
        }
        // AI captions would go here in the future

        await fs.promises.writeFile(captionPath, captionContent, "utf-8");
      }

      exported++;
    } catch (error) {
      errors.push(`${file.name}: ${error.message}`);
    }

    // Report progress
    onProgress(i + 1, total);
  }

  return {
    exported,
    destination,
    errors,
  };
}

module.exports = {
  exportDataset,
};
