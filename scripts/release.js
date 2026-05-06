import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

const distDir = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');
const outFile = resolve(releaseDir, `${version}.zip`);

if (!existsSync(distDir)) {
  console.error('Error: dist/ not found — run npm run build first');
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
execFileSync('zip', ['-rq', outFile, '.'], { cwd: distDir });

console.log(`✓ release/${version}.zip`);
