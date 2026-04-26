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
    async (_event, fingerprints = [], tagNames = []) => {
      try {
        const store = getStore();
        const cleanFingerprints = Array.isArray(fingerprints)
          ? fingerprints.filter(Boolean)
          : [];
        const cleanNames = Array.isArray(tagNames)
          ? tagNames
            .map((name) => (name ?? "").toString().trim())
            .filter(Boolean)
          : [];
        if (!cleanFingerprints.length || !cleanNames.length) {
          return { updates: {}, tags: store.listTags() };
        }
        const updates = store.assignTags(cleanFingerprints, cleanNames);
        return { updates, tags: store.listTags() };
      } catch (error) {
        console.error("Failed to assign tags:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle(
    "metadata:remove-tag",
    async (_event, fingerprints = [], tagName) => {
      try {
        const store = getStore();
        const cleanFingerprints = Array.isArray(fingerprints)
          ? fingerprints.filter(Boolean)
          : [];
        const cleanName = (tagName ?? "").toString().trim();
        if (!cleanFingerprints.length || !cleanName) {
          return { updates: {}, tags: store.listTags() };
        }
        const updates = store.removeTag(cleanFingerprints, cleanName);
        return { updates, tags: store.listTags() };
      } catch (error) {
        console.error("Failed to remove tag:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle(
    "metadata:set-rating",
    async (_event, fingerprints = [], ratingValue) => {
      try {
        const store = getStore();
        const cleanFingerprints = Array.isArray(fingerprints)
          ? fingerprints.filter(Boolean)
          : [];
        if (!cleanFingerprints.length) {
          return { updates: {} };
        }
        const rating =
          ratingValue === null || ratingValue === undefined
            ? null
            : Math.max(0, Math.min(5, Math.round(Number(ratingValue))));
        const updates = store.setRating(cleanFingerprints, rating);
        return { updates };
      } catch (error) {
        console.error("Failed to set rating:", error);
        return { updates: {}, error: error?.message || String(error) };
      }
    }
  );

  ipcMain.handle("metadata:get", async (_event, fingerprints = []) => {
    try {
      const store = getStore();
      const cleanFingerprints = Array.isArray(fingerprints)
        ? fingerprints.filter(Boolean)
        : [];
      return { updates: store.getMetadataForFingerprints(cleanFingerprints) };
    } catch (error) {
      console.error("Failed to load metadata:", error);
      return { updates: {}, error: error?.message || String(error) };
    }
  });

  ipcMain.handle(
    "metadata:set-caption",
    async (_event, fingerprint, caption, aiTags, model) => {
      console.log("[DEBUG] metadata:set-caption called:", {
        fingerprint: fingerprint?.slice(0, 20) + "...",
        captionLength: caption?.length,
        tagsCount: aiTags?.length,
        model,
      });
      try {
        const store = getStore();
        if (!fingerprint) {
          return { success: false, error: "No fingerprint provided" };
        }
        const result = store.setCaption(fingerprint, caption, aiTags, model);
        console.log("[DEBUG] setCaption result:", result);
        return { success: true, metadata: result };
      } catch (error) {
        console.error("Failed to save caption:", error);
        return { success: false, error: error?.message || String(error) };
      }
    }
  );
}

module.exports = { init };
