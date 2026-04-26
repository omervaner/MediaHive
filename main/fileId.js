// Stable physical-file identifier.
//
// file_id = `${dev}-${ino}-${createdMs}`
//   dev + ino: identifies the file on disk (survives moves within a fs,
//              distinct for clonefile/Finder Duplicate copies).
//   createdMs: tie-breaker against inode reuse after deletion.
//
// Uses bigint stats so dev/ino don't lose precision on Windows volumes
// where NTFS file indexes can exceed 2^53. The bigint values are
// stringified directly — never passed through Math.round or arithmetic.

const fs = require("fs");

async function buildFileId(filePath) {
  const stats = await fs.promises.stat(filePath, { bigint: true });
  return buildFileIdFromStats(stats);
}

function buildFileIdFromStats(bigintStats) {
  const dev = String(bigintStats.dev);
  const ino = String(bigintStats.ino);
  const createdMs = Number(
    bigintStats.birthtimeMs || bigintStats.ctimeMs || bigintStats.mtimeMs || 0n
  );
  return `${dev}-${ino}-${createdMs}`;
}

module.exports = {
  buildFileId,
  buildFileIdFromStats,
};
