/**
 * generate_filesize.js
 * Produces meta/filesize.csv with columns:
 * commit,file,size,type,date,time,timezone,datetime
 *
 * Usage:
 *   node meta/generate_filesize.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
console.log("generate_filesize.js running...");


const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, 'meta');
const outputCSV = path.join(outputDir, 'filesize.csv');

const EXT_INCLUDE = ['.js', '.css'];   // only files you care about

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Get all commits in history
function getAllCommits() {
  const out = safeExec('git rev-list --all');
  if (!out) throw new Error('Cannot read git history.');
  return out.split('\n');
}

// List all files present at a specific commit
function listFilesAtCommit(commit) {
  const out = safeExec(`git ls-tree -r --name-only ${commit}`);
  if (!out) return [];
  return out.split('\n').filter(x => x.trim().length > 0);
}

// Get file blob size at commit
function fileBlobSize(commit, filePath) {
  const ls = safeExec(`git ls-tree ${commit} "${filePath}"`);
  if (!ls) return null;

  const parts = ls.split(/\s+/);
  if (parts.length < 3) return null;

  const blobSHA = parts[2];
  const size = safeExec(`git cat-file -s ${blobSHA}`);
  if (!size) return null;

  return Number(size);
}

// Get ISO timestamp for commit
function getCommitISO(commit) {
  const iso = safeExec(`git show -s --format=%aI ${commit}`);
  if (!iso) return null;

  // YYYY-MM-DDTHH:MM:SS±HH:MM
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  const timezone = iso.slice(19);
  return { date, time, timezone, datetime: iso };
}

// Filesystem prep
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Start CSV
const rows = [
  'commit,file,size,type,date,time,timezone,datetime'
];

// Main loop
function main() {
  const commits = getAllCommits();

  for (const commit of commits) {
    const shortCommit = commit.slice(0, 8);
    const iso = getCommitISO(commit);
    if (!iso) continue;

    const files = listFilesAtCommit(commit);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!EXT_INCLUDE.includes(ext)) continue;

      const size = fileBlobSize(commit, file);
      if (size == null) continue;

      rows.push([
        shortCommit,
        file,
        size,
        ext.slice(1),          // remove "."
        iso.date,
        iso.time,
        iso.timezone,
        iso.datetime
      ].join(','));
    }
  }

  fs.writeFileSync(outputCSV, rows.join('\n'), 'utf8');
  console.log(`Generated ${outputCSV}`);
}

main();
