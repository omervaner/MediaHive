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

    return captionService.batchCaption(files, {
      ...options,
      model,
      endpoint,
      onProgress: (progress) => {
        // Save each successful caption immediately to the database
        if (progress.lastResult?.success && progress.currentPath) {
          const file = files.find((f) => f.fullPath === progress.currentPath);
          if (file?.file_id) {
            try {
              // Save caption to captions table
              store.setCaption(
                file.file_id,
                progress.lastResult.caption,
                progress.lastResult.tags,
                model
              );

              // For batch operations, also save AI tags as regular tags (auto-apply)
              if (progress.lastResult.tags?.length > 0) {
                store.assignTags([file.file_id], progress.lastResult.tags);
              }

              progress.lastResult.saved = true;
            } catch (err) {
              console.error("Failed to save caption for", progress.currentPath, err);
              progress.lastResult.saveError = err.message;
            }
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
