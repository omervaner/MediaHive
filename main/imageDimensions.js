const path = require("path");
const sharp = require("sharp");

const CACHE = new Map();

function cacheKey(filePath, stats) {
  const size = stats?.size ?? 0;
  const mtimeMs = stats?.mtimeMs ?? 0;
  return `${filePath}::${size}::${mtimeMs}`;
}

async function getImageDimensions(filePath, stats = null) {
  const key = cacheKey(filePath, stats);
  if (CACHE.has(key)) {
    console.log('[imageDimensions] Cache hit:', path.basename(filePath));
    return CACHE.get(key);
  }

  console.log('[imageDimensions] Computing for:', path.basename(filePath));

  try {
    const metadata = await sharp(filePath).metadata();
    let width = metadata.width;
    let height = metadata.height;

    // EXIF orientation 5-8 means image is rotated 90° - swap dimensions
    // 1=normal, 2=flip-h, 3=180°, 4=flip-v, 5=transpose, 6=90°CW, 7=transverse, 8=90°CCW
    const orientation = metadata.orientation;
    if (orientation >= 5 && orientation <= 8) {
      [width, height] = [height, width];
      console.log('[imageDimensions] EXIF orientation', orientation, '- swapped to', width, 'x', height);
    }

    if (width > 0 && height > 0) {
      const dims = {
        width: Math.round(width),
        height: Math.round(height),
        aspectRatio: width / height,
      };
      console.log('[imageDimensions] Success:', path.basename(filePath), dims);
      // Only cache successful results
      CACHE.set(key, dims);
      return dims;
    }

    console.log('[imageDimensions] Invalid dimensions from sharp:', path.basename(filePath));
    return null;
  } catch (error) {
    console.warn('[imageDimensions] Failed:', path.basename(filePath), error.message);
    return null;
  }
}

module.exports = {
  getImageDimensions,
};
