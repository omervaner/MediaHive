const path = require("path");
const { computeDHash, findDuplicateGroups } = require("./perceptualHash");

function init({ ipcMain, getStore }) {
  // Duplicate finder handlers
  ipcMain.handle('duplicates:find', async (_event, fingerprints) => {
    try {
      const store = getStore();

      // Get existing hashes from database
      const items = store.getPhashes(fingerprints);

      // Compute missing hashes
      const needsHash = items.filter(item => !item.phash);
      console.log(`[duplicates] Computing hashes for ${needsHash.length} of ${items.length} files`);

      for (const item of needsHash) {
        // Only hash images, not videos
        const ext = path.extname(item.fullPath).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'].includes(ext)) {
          continue;
        }

        try {
          const phash = await computeDHash(item.fullPath);
          if (phash) {
            item.phash = phash;
            store.setPhash(item.fingerprint, phash);
          }
        } catch (err) {
          console.warn('[duplicates] Failed to hash', item.fullPath, err.message);
        }
      }

      // Find duplicate groups
      const groups = findDuplicateGroups(items, 5);
      console.log(`[duplicates] Found ${groups.length} duplicate groups`);

      return {
        success: true,
        groups: groups.map(group => group.map(item => ({
          fingerprint: item.fingerprint,
          fullPath: item.fullPath,
        }))),
      };
    } catch (error) {
      console.error('[duplicates] Find failed', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { init };
