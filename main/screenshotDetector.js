/**
 * Screenshot detection based on filename patterns, known screen resolutions,
 * and aspect ratio analysis. No AI/ML required.
 */

// Filename patterns that suggest screenshots
const SCREENSHOT_PATTERNS = [
  /^screenshot/i,
  /^screen shot/i,
  /^IMG_\d{4}$/i,        // iPhone photos (exact 4 digits, no extension)
  /^Simulator Screen/i,
  /^Capture/i,
];

// Known screen resolutions [width, height] - both orientations checked
const KNOWN_SCREEN_RESOLUTIONS = [
  // Desktop
  [1920, 1080],  // 1080p
  [2560, 1440],  // 1440p
  [3840, 2160],  // 4K
  [1440, 900],   // MacBook Pro 15"
  [1680, 1050],  // Various monitors
  [1366, 768],   // Common laptop
  [1536, 864],   // Common laptop
  [2880, 1800],  // MacBook Pro Retina
  [3024, 1964],  // MacBook Pro 14"
  [3456, 2234],  // MacBook Pro 16"

  // iPhone
  [1170, 2532],  // iPhone 12/13 Pro
  [1284, 2778],  // iPhone 12/13 Pro Max
  [1290, 2796],  // iPhone 14 Pro Max
  [1179, 2556],  // iPhone 14 Pro
  [1206, 2622],  // iPhone 15/15 Pro
  [1320, 2868],  // iPhone 15 Pro Max
  [1125, 2436],  // iPhone X/XS/11 Pro
  [1242, 2688],  // iPhone XS Max/11 Pro Max
  [750, 1334],   // iPhone 6/7/8/SE
  [1080, 1920],  // iPhone 6+/7+/8+

  // Android common
  [1080, 2400],  // Many Android phones
  [1080, 2340],  // Many Android phones
  [1440, 3200],  // Samsung Galaxy S21 Ultra
  [1440, 3088],  // Samsung Galaxy S20
  [1080, 2280],  // OnePlus, Xiaomi
  [1080, 2310],  // Various Android
];

/**
 * Check if dimensions match a known screen resolution (either orientation)
 */
function isKnownScreenResolution(width, height) {
  if (!width || !height) return false;

  for (const [w, h] of KNOWN_SCREEN_RESOLUTIONS) {
    // Check both orientations
    if ((width === w && height === h) || (width === h && height === w)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if filename matches screenshot patterns
 */
function matchesScreenshotPattern(fileName) {
  if (!fileName) return false;

  // Remove extension for matching
  const baseName = fileName.replace(/\.[^.]+$/, '');

  for (const pattern of SCREENSHOT_PATTERNS) {
    if (pattern.test(baseName)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect if an image is likely a screenshot
 * @param {string} filePath - Full path to file
 * @param {object} dimensions - { width, height, aspectRatio }
 * @param {string} fileName - Base filename
 * @returns {{ isScreenshot: boolean, confidence: number, reasons: string[] }}
 */
function detectScreenshot(filePath, dimensions, fileName) {
  let score = 0;
  const reasons = [];

  const width = dimensions?.width || 0;
  const height = dimensions?.height || 0;
  const aspectRatio = dimensions?.aspectRatio || (width && height ? width / height : 0);

  // 1. Filename pattern check (+40)
  if (matchesScreenshotPattern(fileName)) {
    score += 40;
    reasons.push('filename pattern');
  }

  // 2. Exact screen resolution match (+50)
  if (isKnownScreenResolution(width, height)) {
    score += 50;
    reasons.push(`known resolution ${width}x${height}`);
  }

  // 3. Extreme aspect ratio (+20) - phone screenshots are very tall/wide
  if (aspectRatio > 0 && (aspectRatio < 0.5 || aspectRatio > 2.0)) {
    score += 20;
    reasons.push(`extreme aspect ratio ${aspectRatio.toFixed(2)}`);
  }

  return {
    isScreenshot: score >= 50,
    confidence: Math.min(score, 100),
    reasons,
  };
}

module.exports = {
  detectScreenshot,
};
