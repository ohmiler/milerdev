import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'src', 'app', 'admin'),
  path.join(root, 'src', 'components', 'admin'),
];

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const suspiciousPattern = /(Ã.|Â.|â[\u0080-\u00FF]|à[\u0080-\u00FF]|ð[\u0080-\u00FF]{2}|�)/;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (allowedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const file of targets.flatMap((dir) => walk(dir))) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (suspiciousPattern.test(line)) {
      findings.push({
        file: path.relative(root, file),
        line: index + 1,
        sample: line.trim().slice(0, 160),
      });
    }
  });
}

if (findings.length === 0) {
  console.log('Admin text scan passed: no suspicious mojibake found.');
  process.exit(0);
}

console.error('Admin text scan failed. Suspicious mojibake found:\n');
for (const finding of findings) {
  console.error(`${finding.file}:${finding.line}`);
  console.error(`  ${finding.sample}`);
}

process.exit(1);
