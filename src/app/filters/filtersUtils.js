import { useMemo } from "react";

export const createDefaultFilters = () => ({
  includeTags: [],
  excludeTags: [],
  minRating: null,
  exactRating: null,
  minResolution: null, // null | 512 | 768 | 1024 | 2048 | 3840
  aspectRatio: null,   // null | 'square' | 'portrait' | 'landscape'
  screenshotFilter: null, // null | 'hide' | 'only'
});

// Resolution presets (minimum short edge)
export const RESOLUTION_PRESETS = [
  { value: null, label: "All" },
  { value: 512, label: "512+" },
  { value: 768, label: "768+" },
  { value: 1024, label: "1024+" },
  { value: 2048, label: "2K+" },
  { value: 3840, label: "4K+" },
];

// Aspect ratio categories
export const ASPECT_RATIO_OPTIONS = [
  { value: null, label: "All" },
  { value: "square", label: "Square" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

// Screenshot filter options
export const SCREENSHOT_FILTER_OPTIONS = [
  { value: null, label: "All" },
  { value: "hide", label: "Hide Screenshots" },
  { value: "only", label: "Only Screenshots" },
];

export const matchesResolution = (file, minRes) => {
  if (minRes === null || minRes === undefined) return true;
  // Dimensions are stored in file.dimensions.width/height
  const dims = file.dimensions;
  if (!dims) return true; // No dimension data, don't filter out
  const width = Number(dims.width) || 0;
  const height = Number(dims.height) || 0;
  if (width === 0 || height === 0) return true; // Invalid dimensions, don't filter out
  const shortEdge = Math.min(width, height);
  return shortEdge >= minRes;
};

export const matchesAspectRatio = (file, category) => {
  if (category === null || category === undefined) return true;

  const ar = Number(file.aspectRatio);
  if (!Number.isFinite(ar) || ar <= 0) return true; // No AR data, don't filter out

  if (category === "square") return ar >= 0.9 && ar <= 1.1;
  if (category === "portrait") return ar < 0.9;
  if (category === "landscape") return ar > 1.1;
  return true;
};

export const matchesScreenshotFilter = (file, filter) => {
  if (filter === null || filter === undefined) return true;

  const isScreenshot = file.isScreenshot === true;

  if (filter === "hide") return !isScreenshot;
  if (filter === "only") return isScreenshot;
  return true;
};

export const normalizeTagList = (tags) =>
  Array.from(
    new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) => (tag ?? "").toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

const clampRatingValue = (value, min, max) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (Number.isNaN(rounded)) return null;
  return Math.min(max, Math.max(min, rounded));
};

export const sanitizeMinRating = (value) => clampRatingValue(value, 1, 5);
export const sanitizeExactRating = (value) => clampRatingValue(value, 0, 5);

export const formatStars = (value) => {
  const safe = clampRatingValue(value, 0, 5);
  const filled = Math.max(0, safe ?? 0);
  const empty = Math.max(0, 5 - filled);
  return `${"★".repeat(filled)}${"☆".repeat(empty)}`;
};

export const formatRatingLabel = (value, mode) => {
  if (value === null || value === undefined) return null;
  const stars = formatStars(value);
  return mode === "min" ? `≥ ${stars}` : `= ${stars}`;
};

export const useFiltersActiveCount = (filters) =>
  useMemo(() => {
    const includeCount = filters.includeTags?.length ?? 0;
    const excludeCount = filters.excludeTags?.length ?? 0;
    const ratingCount =
      filters.exactRating !== null && filters.exactRating !== undefined
        ? 1
        : filters.minRating !== null && filters.minRating !== undefined
        ? 1
        : 0;
    const resolutionCount =
      filters.minResolution !== null && filters.minResolution !== undefined ? 1 : 0;
    const aspectRatioCount =
      filters.aspectRatio !== null && filters.aspectRatio !== undefined ? 1 : 0;
    const screenshotCount =
      filters.screenshotFilter !== null && filters.screenshotFilter !== undefined ? 1 : 0;
    return includeCount + excludeCount + ratingCount + resolutionCount + aspectRatioCount + screenshotCount;
  }, [filters]);
