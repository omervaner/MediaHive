const captionService = require("./captionService");

function init({ ipcMain, getCurrentSettings, loadSettings, getStore }) {
  ipcMain.handle("caption:generate", async (_event, imagePath, requestId) => {
    const settings = getCurrentSettings() || (await loadSettings());
    const model = settings?.ollama?.model;
    const endpoint = settings?.ollama?.endpoint || captionService.DEFAULT_ENDPOINT;

    if (!model) {
      return { success: false, error: "No AI model configured. Please set up AI captioning first." };
    }

    return captionService.generateCaption(imagePath, { model, endpoint, requestId });
  });

  ipcMain.handle("caption:tags", async (_event, imagePath, requestId) => {
    const settings = getCurrentSettings() || (await loadSettings());
    const model = settings?.ollama?.model;
    const endpoint = settings?.ollama?.endpoint || captionService.DEFAULT_ENDPOINT;

    if (!model) {
      return { success: false, error: "No AI model configured. Please set up AI captioning first." };
    }

    return captionService.generateTags(imagePath, { model, endpoint, requestId });
  });

  ipcMain.handle("caption:both", async (_event, imagePath, requestId) => {
    const settings = getCurrentSettings() || (await loadSettings());
    const model = settings?.ollama?.model;
    const endpoint = settings?.ollama?.endpoint || captionService.DEFAULT_ENDPOINT;

    if (!model) {
      return { success: false, error: "No AI model configured. Please set up AI captioning first." };
    }

    return captionService.generateCaptionAndTags(imagePath, { model, endpoint, requestId });
  });

  ipcMain.handle("caption:cancel", (_event, requestId) => {
    return captionService.cancelRequest(requestId);
  });

  ipcMain.handle("caption:batch", async (event, files, options) => {
    const settings = getCurrentSettings() || (await loadSettings());
    const model = settings?.ollama?.model;
    const endpoint = settings?.ollama?.endpoint || captionService.DEFAULT_ENDPOINT;

    if (!model) {
      return { success: false, error: "No AI model configured. Please set up AI captioning first." };
    }

    const store = getStore();

    console.log("[DEBUG] caption:batch starting with", files.length, "files");
    // Log first few files to verify structure
    console.log("[DEBUG] First file structure:", files[0] ? {
      fullPath: files[0].fullPath,
      name: files[0].name,
      fingerprint: files[0].fingerprint?.slice(0, 20),
      hasFingerprint: !!files[0].fingerprint,
    } : "NO FILES");

    return captionService.batchCaption(files, {
      ...options,
      model,
      endpoint,
      onProgress: (progress) => {
        console.log("[DEBUG] batch progress:", {
          current: progress.current,
          total: progress.total,
          status: progress.status,
          hasLastResult: !!progress.lastResult,
          lastResultSuccess: progress.lastResult?.success,
          currentPath: progress.currentPath,
        });

        // Save each successful caption immediately to the database
        if (progress.lastResult?.success && progress.currentPath) {
          const file = files.find((f) => f.fullPath === progress.currentPath);
          console.log("[DEBUG] Looking for file to save:", {
            currentPath: progress.currentPath,
            foundFile: !!file,
            fingerprint: file?.fingerprint?.slice(0, 20),
            captionLength: progress.lastResult.caption?.length,
            tagsCount: progress.lastResult.tags?.length,
          });
          if (file?.fingerprint) {
            try {
              // Save caption to captions table
              store.setCaption(
                file.fingerprint,
                progress.lastResult.caption,
                progress.lastResult.tags,
                model
              );

              // For batch operations, also save AI tags as regular tags (auto-apply)
              if (progress.lastResult.tags?.length > 0) {
                store.assignTags([file.fingerprint], progress.lastResult.tags);
              }

              console.log("[DEBUG] Caption and tags saved for", file.fingerprint?.slice(0, 20));
              progress.lastResult.saved = true;
            } catch (err) {
              console.error("Failed to save caption for", progress.currentPath, err);
              progress.lastResult.saveError = err.message;
            }
          } else {
            console.log("[DEBUG] No fingerprint found for file, cannot save");
          }
        }
        event.sender.send("caption:batch-progress", progress);
      },
    });
  });

  ipcMain.handle("caption:batch-cancel", (_event, batchId) => {
    return captionService.cancelBatch(batchId);
  });
}

module.exports = { init };
