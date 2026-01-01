// perceptualHash.js - Perceptual hashing for duplicate image detection
const sharp = require('sharp');

/**
 * Compute difference hash (dHash) for an image.
 * Resizes to 9x8 grayscale, compares adjacent pixels horizontally.
 * Returns a 64-bit hash as 16-char hex string.
 * 
 * @param {string} imagePath - Path to image file
 * @returns {Promise<string|null>} 16-char hex hash or null on error
 */
async function computeDHash(imagePath) {
  try {
    // Resize to 9x8 grayscale (9 width gives us 8 horizontal comparisons per row)
    const { data, info } = await sharp(imagePath)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.width !== 9 || info.height !== 8) {
      console.warn('[perceptualHash] Unexpected dimensions:', info);
      return null;
    }

    // Build 64-bit hash: compare each pixel to its right neighbor
    let hash = BigInt(0);
    let bitIndex = 0;

    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const leftPixel = data[y * 9 + x];
        const rightPixel = data[y * 9 + x + 1];
        
        // Set bit to 1 if left pixel is brighter than right
        if (leftPixel > rightPixel) {
          hash |= (BigInt(1) << BigInt(bitIndex));
        }
        bitIndex++;
      }
    }

    // Convert to 16-char hex string (padded)
    return hash.toString(16).padStart(16, '0');
  } catch (error) {
    console.warn('[perceptualHash] Failed to compute hash for', imagePath, error.message);
    return null;
  }
}

/**
 * Compute Hamming distance between two hex hashes.
 * Counts the number of differing bits.
 * 
 * @param {string} hash1 - First 16-char hex hash
 * @param {string} hash2 - Second 16-char hex hash
 * @returns {number} Number of differing bits (0-64)
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== 16 || hash2.length !== 16) {
    return 64; // Maximum distance if invalid
  }

  const h1 = BigInt('0x' + hash1);
  const h2 = BigInt('0x' + hash2);
  let xor = h1 ^ h2;
  
  // Count set bits (Brian Kernighan's algorithm)
  let distance = 0;
  while (xor > 0n) {
    xor &= (xor - 1n);
    distance++;
  }
  
  return distance;
}

/**
 * Find groups of duplicate/similar images based on perceptual hash.
 * 
 * @param {Array<{fingerprint: string, phash: string, fullPath: string}>} items - Items with hashes
 * @param {number} threshold - Maximum Hamming distance to consider duplicates (default: 5)
 * @returns {Array<Array<{fingerprint: string, phash: string, fullPath: string}>>} Groups of duplicates
 */
function findDuplicateGroups(items, threshold = 5) {
  // Filter to items with valid hashes
  const withHashes = items.filter(item => item.phash && item.phash.length === 16);
  
  if (withHashes.length < 2) {
    return [];
  }

  // Track which items have been assigned to a group
  const assigned = new Set();
  const groups = [];

  for (let i = 0; i < withHashes.length; i++) {
    const item = withHashes[i];
    
    if (assigned.has(item.fingerprint)) {
      continue;
    }

    // Find all items similar to this one
    const group = [item];
    assigned.add(item.fingerprint);

    for (let j = i + 1; j < withHashes.length; j++) {
      const other = withHashes[j];
      
      if (assigned.has(other.fingerprint)) {
        continue;
      }

      const distance = hammingDistance(item.phash, other.phash);
      
      if (distance <= threshold) {
        group.push(other);
        assigned.add(other.fingerprint);
      }
    }

    // Only include groups with 2+ items (actual duplicates)
    if (group.length >= 2) {
      groups.push(group);
    }
  }

  return groups;
}

module.exports = {
  computeDHash,
  hammingDistance,
  findDuplicateGroups,
};
