import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { pi } = JSON.parse(readFileSync(join(root, '.work/config.json'), 'utf8'));
execFileSync(process.execPath, [
  '--import', pathToFileURL(join(pi, 'node_modules/tsx/dist/loader.mjs')).href,
  join(root, '.work/parity.mts'),
], { cwd: pi, stdio: 'inherit' });
