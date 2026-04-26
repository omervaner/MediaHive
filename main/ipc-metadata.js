function init({ ipcMain, getStore }) {
  ipcMain.handle("metadata:list-tags", async () => {
    try {
      const store = getStore();
      return { tags: store.listTags() };
    } catch (error) {
      console.error("Failed to list tags:", error);
      return { tags: [], error: error?.message || String(error) };
    }
  });

  ipcMain.handle(
    "metadata:add-tags",
    async (_event, fileIds = [], tagNames = []) => {
      try {
        const store = getStore();
        const cleanFileIds = Array.isArray(fileIds)
          ? fileIds.filter(Boolean)
          : [];
        const cleanNames = Array.isArray(tagNames)
          ? tagNames
            .map((name) => (name ?? "").toString().trim())
            .filter(Boolean)
          : [];
        if (!cleanFileIds.length || !cleanNames.length) {
          return { updates: {}, tags: store.listTags() };
        }
        const updates = store.assignTags(cleanFileIds, cleanNames);
        return { updates, tags: store.listTags() };
      } catch (error) {
        console.error("Failed to assign tags:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle(
    "metadata:remove-tag",
    async (_event, fileIds = [], tagName) => {
      try {
        const store = getStore();
        const cleanFileIds = Array.isArray(fileIds)
          ? fileIds.filter(Boolean)
          : [];
        const cleanName = (tagName ?? "").toString().trim();
        if (!cleanFileIds.length || !cleanName) {
          return { updates: {}, tags: store.listTags() };
        }
        const updates = store.removeTag(cleanFileIds, cleanName);
        return { updates, tags: store.listTags() };
      } catch (error) {
        console.error("Failed to remove tag:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle(
    "metadata:set-rating",
    async (_event, fileIds = [], ratingValue) => {
      try {
        const store = getStore();
        const cleanFileIds = Array.isArray(fileIds)
          ? fileIds.filter(Boolean)
          : [];
        if (!cleanFileIds.length) {
          return { updates: {} };
        }
        const rating =
          ratingValue === null || ratingValue === undefined
            ? null
            : Math.max(0, Math.min(5, Math.round(Number(ratingValue))));
        const updates = store.setRating(cleanFileIds, rating);
        return { updates };
      } catch (error) {
        console.error("Failed to set rating:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle("metadata:get", async (_event, fileIds = []) => {
    try {
      const store = getStore();
      const cleanFileIds = Array.isArray(fileIds)
        ? fileIds.filter(Boolean)
        : [];
      return { updates: store.getMetadataForFileIds(cleanFileIds) };
    } catch (error) {
      console.error("Failed to load metadata:", error);
      return { updates: {}, error: error?.message || String(error) };
    }
  });

  ipcMain.handle(
    "metadata:set-caption",
    async (_event, fileId, caption, aiTags, model) => {
      try {
        const store = getStore();
        if (!fileId) {
          return { success: false, error: "No file_id provided" };
        }
        const result = store.setCaption(fileId, caption, aiTags, model);
        return { success: true, metadata: result };
      } catch (error) {
        console.error("Failed to save caption:", error);
        return { success: false, error: error?.message || String(error) };
      }
    }
  );
}

module.exports = { init };
