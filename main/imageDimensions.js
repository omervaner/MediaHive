const fs = require("fs");
const path = require("path");

const CACHE = new Map();

function cacheKey(filePath, stats) {
  const size = stats?.size ?? 0;
  const mtimeMs = stats?.mtimeMs ?? 0;
  return `${filePath}::${size}::${mtimeMs}`;
}

// PNG: 8-byte signature + IHDR chunk with width/height
function parsePng(buffer) {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null;
  }
  // IHDR chunk starts at byte 8, width at 16, height at 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

// JPEG: Search for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
function parseJpeg(buffer) {
  if (buffer.length < 2) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null; // Not JPEG

  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // Skip padding bytes
    if (marker === 0xff) {
      offset++;
      continue;
    }

    // SOF0 (baseline) or SOF2 (progressive)
    if (marker === 0xc0 || marker === 0xc2) {
      if (offset + 9 > buffer.length) return null;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip other markers
    if (marker >= 0xc0 && marker <= 0xfe) {
      if (offset + 4 > buffer.length) return null;
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    } else {
      offset += 2;
    }
  }
  return null;
}

// GIF: Header contains dimensions at fixed positions
function parseGif(buffer) {
  if (buffer.length < 10) return null;
  // GIF87a or GIF89a signature
  if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46) return null;

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return { width, height };
}

// WebP: RIFF container
function parseWebp(buffer) {
  if (buffer.length < 30) return null;
  // RIFF....WEBP signature
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buffer.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunkType = buffer.toString("ascii", 12, 16);

  // VP8 (lossy)
  if (chunkType === "VP8 ") {
    if (buffer.length < 30) return null;
    // Frame tag at offset 23, dimensions at 26-30
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }

  // VP8L (lossless)
  if (chunkType === "VP8L") {
    if (buffer.length < 25) return null;
    // Signature byte at 20, then 4 bytes with packed width/height
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  // VP8X (extended)
  if (chunkType === "VP8X") {
    if (buffer.length < 30) return null;
    // Canvas width at 24-26 (24-bit LE + 1), height at 27-29
    const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
    const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
    return { width, height };
  }

  return null;
}

// BMP: Header contains dimensions
function parseBmp(buffer) {
  if (buffer.length < 26) return null;
  if (buffer[0] !== 0x42 || buffer[1] !== 0x4d) return null; // BM signature

  // DIB header starts at offset 14, width at 18, height at 22
  const width = buffer.readInt32LE(18);
  const height = Math.abs(buffer.readInt32LE(22)); // Height can be negative
  return { width, height };
}

// TIFF: Parse IFD for ImageWidth and ImageLength tags
function parseTiff(buffer) {
  if (buffer.length < 8) return null;

  // Check byte order
  let readUInt16, readUInt32;
  if (buffer[0] === 0x49 && buffer[1] === 0x49) {
    // Little endian (II)
    readUInt16 = (buf, off) => buf.readUInt16LE(off);
    readUInt32 = (buf, off) => buf.readUInt32LE(off);
  } else if (buffer[0] === 0x4d && buffer[1] === 0x4d) {
    // Big endian (MM)
    readUInt16 = (buf, off) => buf.readUInt16BE(off);
    readUInt32 = (buf, off) => buf.readUInt32BE(off);
  } else {
    return null;
  }

  // Check magic number (42)
  if (readUInt16(buffer, 2) !== 42) return null;

  // IFD offset
  const ifdOffset = readUInt32(buffer, 4);
  if (ifdOffset + 2 > buffer.length) return null;

  const numEntries = readUInt16(buffer, ifdOffset);
  let width = null, height = null;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + (i * 12);
    if (entryOffset + 12 > buffer.length) break;

    const tag = readUInt16(buffer, entryOffset);
    const type = readUInt16(buffer, entryOffset + 2);

    // ImageWidth (256) or ImageLength (257)
    if (tag === 256 || tag === 257) {
      let value;
      if (type === 3) { // SHORT
        value = readUInt16(buffer, entryOffset + 8);
      } else if (type === 4) { // LONG
        value = readUInt32(buffer, entryOffset + 8);
      }

      if (tag === 256) width = value;
      if (tag === 257) height = value;
    }

    if (width !== null && height !== null) break;
  }

  if (width && height) return { width, height };
  return null;
}

async function getImageDimensions(filePath, stats = null) {
  const key = cacheKey(filePath, stats);
  if (CACHE.has(key)) {
    return CACHE.get(key);
  }

  const ext = path.extname(filePath).toLowerCase();
  let dims = null;

  try {
    // Read enough bytes to parse headers (most formats need < 100 bytes, TIFF may need more)
    const handle = await fs.promises.open(filePath, "r");
    try {
      const buffer = Buffer.alloc(4096);
      const { bytesRead } = await handle.read(buffer, 0, 4096, 0);
      const data = buffer.slice(0, bytesRead);

      switch (ext) {
        case ".png":
          dims = parsePng(data);
          break;
        case ".jpg":
        case ".jpeg":
          dims = parseJpeg(data);
          break;
        case ".gif":
          dims = parseGif(data);
          break;
        case ".webp":
          dims = parseWebp(data);
          break;
        case ".bmp":
          dims = parseBmp(data);
          break;
        case ".tiff":
        case ".tif":
          dims = parseTiff(data);
          break;
      }
    } finally {
      await handle.close();
    }
  } catch (error) {
    console.warn(`[imageDimensions] Failed to parse ${filePath}:`, error.message || error);
    dims = null;
  }

  if (dims && dims.width > 0 && dims.height > 0) {
    dims = {
      width: Math.round(dims.width),
      height: Math.round(dims.height),
      aspectRatio: dims.width / dims.height,
    };
  } else {
    dims = null;
  }

  CACHE.set(key, dims);
  return dims;
}

module.exports = {
  getImageDimensions,
};
