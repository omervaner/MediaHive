import { useCallback } from "react";
import { normalizeVideoFromMain } from "../videoNormalization";

export function useMetadataActions({
  selectedFileIds,
  setVideos,
  setAvailableTags,
  notify,
}) {
  const applyMetadataPatch = useCallback((updatesByFileId) => {
    if (!updatesByFileId || typeof updatesByFileId !== "object") return;
    setVideos((prev) =>
      prev.map((video) => {
        const fileId = video?.file_id;
        if (!fileId || !updatesByFileId[fileId]) return video;
        return normalizeVideoFromMain({
          ...video,
          ...updatesByFileId[fileId],
          file_id: fileId,
        });
      })
    );
  }, [setVideos]);

  const handleAddTags = useCallback(
    async (tagNames) => {
      const api = window.electronAPI?.metadata;
      if (!api?.addTags) return;
      const fileIds = selectedFileIds;
      if (!fileIds.length) return;
      const cleanNames = Array.isArray(tagNames)
        ? tagNames.map((name) => name.trim()).filter(Boolean)
        : [];
      if (!cleanNames.length) return;
      try {
        const result = await api.addTags(fileIds, cleanNames);
        if (result?.updates) applyMetadataPatch(result.updates);
        if (Array.isArray(result?.tags)) setAvailableTags(result.tags);
        notify(
          `Added ${cleanNames.join(", ")} to ${fileIds.length} item(s)`,
          "success"
        );
      } catch (error) {
        console.error("Failed to add tags:", error);
        notify("Failed to add tags", "error");
      }
    },
    [selectedFileIds, applyMetadataPatch, setAvailableTags, notify]
  );

  const handleRemoveTag = useCallback(
    async (tagName) => {
      const api = window.electronAPI?.metadata;
      if (!api?.removeTag) return;
      const fileIds = selectedFileIds;
      const cleanName = (tagName ?? "").trim();
      if (!fileIds.length || !cleanName) return;
      try {
        const result = await api.removeTag(fileIds, cleanName);
        if (result?.updates) applyMetadataPatch(result.updates);
        if (Array.isArray(result?.tags)) setAvailableTags(result.tags);
        notify(
          `Removed "${cleanName}" from ${fileIds.length} item(s)`,
          "success"
        );
      } catch (error) {
        console.error("Failed to remove tag:", error);
        notify("Failed to remove tag", "error");
      }
    },
    [selectedFileIds, applyMetadataPatch, setAvailableTags, notify]
  );

  const handleClearAllTags = useCallback(
    async (tagNames) => {
      const api = window.electronAPI?.metadata;
      if (!api?.removeTag) return;
      const fileIds = selectedFileIds;
      if (!fileIds.length || !tagNames?.length) return;
      try {
        let lastResult = null;
        for (const tagName of tagNames) {
          const cleanName = (tagName ?? "").trim();
          if (!cleanName) continue;
          lastResult = await api.removeTag(fileIds, cleanName);
          if (lastResult?.updates) applyMetadataPatch(lastResult.updates);
        }
        if (lastResult && Array.isArray(lastResult?.tags)) {
          setAvailableTags(lastResult.tags);
        }
        notify(
          `Cleared ${tagNames.length} tag(s) from ${fileIds.length} item(s)`,
          "success"
        );
      } catch (error) {
        console.error("Failed to clear tags:", error);
        notify("Failed to clear tags", "error");
      }
    },
    [selectedFileIds, applyMetadataPatch, setAvailableTags, notify]
  );

  const handleSetRating = useCallback(
    async (value, targetFileIds = selectedFileIds) => {
      const api = window.electronAPI?.metadata;
      if (!api?.setRating) return;
      const fileIds = (targetFileIds || []).filter(Boolean);
      if (!fileIds.length) return;
      try {
        const result = await api.setRating(fileIds, value);
        if (result?.updates) applyMetadataPatch(result.updates);
        if (value === null || value === undefined) {
          notify(`Cleared rating for ${fileIds.length} item(s)`, "success");
        } else {
          const safeRating = Math.max(0, Math.min(5, Math.round(Number(value))));
          notify(
            `Rated ${fileIds.length} item(s) ${safeRating} star${
              safeRating === 1 ? "" : "s"
            }`,
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to update rating:", error);
        notify("Failed to update rating", "error");
      }
    },
    [selectedFileIds, applyMetadataPatch, notify]
  );

  const handleClearRating = useCallback(() => {
    handleSetRating(null, selectedFileIds);
  }, [handleSetRating, selectedFileIds]);

  const handleApplyExistingTag = useCallback(
    (tagName) => handleAddTags([tagName]),
    [handleAddTags]
  );

  const refreshTagList = useCallback(async () => {
    const api = window.electronAPI?.metadata;
    if (!api?.listTags) return;
    try {
      const res = await api.listTags();
      if (Array.isArray(res?.tags)) {
        setAvailableTags(res.tags);
      }
    } catch (error) {
      console.warn("Failed to refresh tags:", error);
    }
  }, [setAvailableTags]);

  return {
    applyMetadataPatch,
    handleAddTags,
    handleRemoveTag,
    handleClearAllTags,
    handleSetRating,
    handleClearRating,
    handleApplyExistingTag,
    refreshTagList,
  };
}
