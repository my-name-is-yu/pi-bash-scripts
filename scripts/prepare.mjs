import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pi = resolve(process.argv[2] || '.');
const expected = 'aa23e784c647d713e775a8adcaf3c219e84f5068';
const relative = 'packages/coding-agent/src/modes/interactive/components/bash-execution.ts';
const git = (...args) => execFileSync('git', ['-C', pi, ...args], { encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), expected, 'Use the documented pi revision');
assert.equal(git('hash-object', relative), 'b46a9d0b96fb40d2065ee4da67d6247e890b9d66', 'Target component differs from the measured source');
assert(existsSync(join(pi, 'node_modules/tsx/dist/loader.mjs')), 'Install pi dependencies first');
const work = join(root, '.work');
mkdirSync(work, { recursive: true });
if (!existsSync(join(work, 'node_modules'))) symlinkSync(join(pi, 'node_modules'), join(work, 'node_modules'), 'dir');
writeFileSync(join(work, 'package.json'), '{"type":"module"}\n');
const original = readFileSync(join(pi, relative), 'utf8');
let fast = original;
for (const [before, after] of [
  ['private outputLines: string[] = [];', 'private outputLines: string[] = [];\n\tprivate displayTail = "";'],
  ['// Append to output lines', 'this.displayTail = (this.displayTail + clean).slice(-2 * DEFAULT_MAX_BYTES);\n\t\t// Append to output lines'],
  ['const fullOutput = this.outputLines.join("\\n");', 'const fullOutput = this.displayTail;'],
]) {
  assert.equal(fast.split(before).length, 2, `Expected exactly one replacement: ${before}`);
  fast = fast.replace(before, after);
}
// Keep a copy with original import paths so the public diff is easy to review.
writeFileSync(join(work, 'bash-original.ts'), original);
writeFileSync(join(work, 'bash-patched.ts'), fast);
fast = fast.replace(/from "(\.[^"]+)"/g, (_, path) => `from ${JSON.stringify(pathToFileURL(resolve(pi, dirname(relative), path)).href)}`);
writeFileSync(join(work, 'bash-fast.ts'), fast);
for (const name of ['instrument.mts', 'parity.mts']) {
  const template = readFileSync(join(root, 'scripts', `${name}.in`), 'utf8');
  writeFileSync(join(work, name), template.replaceAll('__PI_SOURCE__', pathToFileURL(join(pi, 'packages/coding-agent/src')).href));
}
writeFileSync(join(work, 'config.json'), JSON.stringify({ pi, revision: expected, sourceSHA256: createHash('sha256').update(original).digest('hex'), dirty: git('status', '--porcelain') !== '' }, null, 2));
console.log('Prepared .work/; the pi checkout was not modified.');
