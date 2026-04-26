const sharp = require("sharp");

const CACHE_MAX = 5000;
const CACHE = new Map();

function cacheKey(filePath, stats) {
  const size = stats?.size ?? 0;
  const mtimeMs = stats?.mtimeMs ?? 0;
  return `${filePath}::${size}::${mtimeMs}`;
}

function cacheGet(key) {
  if (!CACHE.has(key)) return undefined;
  const value = CACHE.get(key);
  CACHE.delete(key);
  CACHE.set(key, value);
  return value;
}

function cacheSet(key, value) {
  if (CACHE.has(key)) {
    CACHE.delete(key);
  } else if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
  CACHE.set(key, value);
}

async function getImageDimensions(filePath, stats = null) {
  const key = cacheKey(filePath, stats);
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  try {
    const metadata = await sharp(filePath).metadata();
    let width = metadata.width;
    let height = metadata.height;

    // EXIF orientation 5-8 means image is rotated 90° - swap dimensions
    // 1=normal, 2=flip-h, 3=180°, 4=flip-v, 5=transpose, 6=90°CW, 7=transverse, 8=90°CCW
    const orientation = metadata.orientation;
    if (orientation >= 5 && orientation <= 8) {
      [width, height] = [height, width];
    }

    if (width > 0 && height > 0) {
      const dims = {
        width: Math.round(width),
        height: Math.round(height),
        aspectRatio: width / height,
      };
      cacheSet(key, dims);
      return dims;
    }

    return null;
  } catch (error) {
    console.warn('[imageDimensions] Failed:', filePath, error.message);
    return null;
  }
}

module.exports = {
  getImageDimensions,
};
