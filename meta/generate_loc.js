/**
 * generate_loc.js
 * Generates meta/loc.csv with columns:
 * file,line,type,commit,author,date,time,timezone,datetime,depth,length
 * 
 * Usage: node meta/generate_loc.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = process.cwd(); // run script from repo root
const outputDir = path.join(repoRoot, 'meta');
const outputCSV = path.join(outputDir, 'loc.csv');
const header = 'file,line,type,commit,author,date,time,timezone,datetime,depth,length';
const extInclude = ['.js', '.css']; // files to include

// Check if folder is a Git repo
function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Recursively get all files with included extensions
function getAllFiles(dir) {
  let out = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    if (it.name === 'node_modules' || it.name === '.git') continue;
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      out = out.concat(getAllFiles(full));
    } else if (extInclude.includes(path.extname(it.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

// Safely execute a shell command
function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

// Parse git blame for a file
function parseGitBlame(filePath) {
  const output = safeExec(`git blame --line-porcelain -- "${filePath}"`);
  if (!output) return null;

  const lines = output.split(/\r?\n/);
  const results = [];
  let entry = {};
  let i = 0;

  while (i < lines.length) {
    const ln = lines[i];
    const m = ln.match(/^([0-9a-f]{40})\s/);
    if (m) {
      entry = { commit: m[1], author: null, authorTime: null, lineContent: null };
      i++;
      while (i < lines.length && !lines[i].startsWith('\t')) {
        const h = lines[i];
        if (h.startsWith('author ')) entry.author = h.slice(7);
        if (h.startsWith('author-time ')) entry.authorTime = Number(h.slice(12)) * 1000;
        i++;
      }
      if (i < lines.length && lines[i].startsWith('\t')) {
        entry.lineContent = lines[i].slice(1);
        results.push({ ...entry });
      }
    }
    i++;
  }

  // Add ISO timestamps
  const commitCache = {};
  for (const r of results) {
    if (!r.commit) continue;
    if (!commitCache[r.commit]) {
      const iso = safeExec(`git show -s --format=%aI ${r.commit}`);
      commitCache[r.commit] = iso ? iso.trim() : null;
    }
    r.iso = commitCache[r.commit];
  }
  return results;
}

// Fallback simple file reader
function simpleLines(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  return txt.split(/\r?\n/).map(line => ({ commit: null, author: 'Unknown', iso: null, lineContent: line }));
}

// Split ISO to parts
function splitISO(iso) {
  if (!iso) {
    const d = new Date();
    const tzOffset = -d.getTimezoneOffset();
    const tzSign = tzOffset >= 0 ? '+' : '-';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMins = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const tz = `${tzSign}${tzHours}:${tzMins}`;
    const date = d.toISOString().slice(0, 10);
    const time = d.toTimeString().split(' ')[0];
    return { date, time, tz, datetime: `${date}T${time}${tz}` };
  }
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})([+-]\d{2}:\d{2})/);
  if (!m) return splitISO(null);
  return { date: m[1], time: m[2], tz: m[3], datetime: iso };
}

// Ensure output folder exists
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Collect files
const files = getAllFiles(repoRoot).filter(f => !f.includes('loc.csv'));
console.log(`Found ${files.length} files.`);

const haveGit = isGitRepo();
if (!haveGit) console.warn('Git repo not detected. Using fallback metadata.');

const rows = [header];

for (const filePath of files) {
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  let parsed = haveGit ? parseGitBlame(filePath) : null;
  if (!parsed) parsed = simpleLines(filePath);

  parsed.forEach((entry, idx) => {
    const commit = entry.commit ? entry.commit.slice(0, 8) : Math.random().toString(16).slice(2, 10);
    const type = extInclude.includes(path.extname(filePath)) ? path.extname(filePath).slice(1) : 'other';
    const { date, time, tz, datetime } = splitISO(entry.iso);
    const length = (entry.lineContent || '').length;
    const lineNum = idx + 1;
    const esc = val => val && val.toString().includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
    rows.push([esc(relPath), lineNum, type, esc(commit), esc(entry.author), date, time, tz, datetime, 0, length].join(','));
  });
}

fs.writeFileSync(outputCSV, rows.join('\n'), 'utf8');
console.log(`Generated CSV at ${outputCSV} with ${rows.length - 1} lines.`);
