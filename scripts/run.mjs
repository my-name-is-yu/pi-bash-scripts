import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = join(root, '.work');
const { pi, ...sourceInfo } = JSON.parse(readFileSync(join(work, 'config.json'), 'utf8'));
const mode = process.argv[2] || 'compare';
const runs = Number(process.argv[3] || (mode === 'compare' ? 5 : 1));
assert(['compare', 'original', 'fast'].includes(mode) && Number.isInteger(runs) && runs > 0 && runs <= 20,
  'Usage: node scripts/run.mjs [original|fast|compare] [runs per mode, 1..20]');
const destination = join(work, `run-${Date.now()}`);
mkdirSync(destination);
const fixture = join(destination, 'input.txt');
const fd = openSync(fixture, 'wx');
try {
  execFileSync('rg', ['--sort', 'path', '--no-heading', '--line-number', '.', 'packages', '-g', '*.ts'], { cwd: pi, stdio: ['ignore', fd, 'pipe'] });
} finally { closeSync(fd); }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const input = readFileSync(fixture);
const inputHash = hash(input);
assert(input.length > 0);
writeFileSync(join(destination, 'environment.json'), JSON.stringify({ ...sourceInfo, node: process.version, platform: process.platform, arch: process.arch, bytes: input.length, inputHash, terminal: '100x32', mode, runs }, null, 2));
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const tmux = (...args) => execFileSync('tmux', args, { encoding: 'utf8' });
const sequence = Array.from({ length: runs }, () => mode === 'compare' ? ['original', 'fast'] : [mode]).flat();
let referenceScreen;
console.log(`Results: ${destination}`);
for (const [index, current] of sequence.entries()) {
  const name = `pi-bash-repro-${process.pid}-${index}`;
  const runDir = join(destination, String(index + 1));
  mkdirSync(runDir);
  const agent = join(runDir, 'agent');
  mkdirSync(agent);
  writeFileSync(join(agent, 'settings.json'), '{"lastChangelogVersion":"0.85.1"}\n');
  const ready = join(runDir, 'ready');
  const metrics = join(runDir, 'metrics.jsonl');
  const variables = { PI_CODING_AGENT_DIR: agent, PI_BENCH_MODE: current, PI_BENCH_READY: ready, PI_BENCH_METRICS: metrics, PI_BENCH_RUN: String(index + 1) };
  const assignments = Object.entries(variables).map(([key, value]) => `${key}=${quote(value)}`).join(' ');
  const command = `cd ${quote(pi)} && ${assignments} ${quote(process.execPath)} --import ${quote(pathToFileURL(join(pi, 'node_modules/tsx/dist/loader.mjs')).href)} --import ${quote(pathToFileURL(join(work, 'instrument.mts')).href)} packages/coding-agent/src/experimental/cli.ts --no-session --no-extensions --no-skills --no-prompt-templates`;
  tmux('new-session', '-d', '-s', name, '-x', '100', '-y', '32', command);
  try {
    let trustAnswered = false;
    for (let attempt = 0; attempt < 600 && !existsSync(ready); attempt++) {
      const screen = tmux('capture-pane', '-t', name, '-p');
      if (!trustAnswered && screen.includes('Trust project folder?')) {
        // Refuse trust in the isolated settings; do not install project resources.
        tmux('send-keys', '-t', name, 'Down', 'Down', 'Down', 'Enter');
        trustAnswered = true;
      }
      await setTimeout(200);
    }
    assert(existsSync(ready), 'Startup did not finish within 120 s');
    await setTimeout(300);
    tmux('send-keys', '-t', name, '-l', `!cat ${quote(fixture)}`);
    tmux('send-keys', '-t', name, 'Enter');
    for (let attempt = 0; attempt < 600 && !existsSync(metrics); attempt++) await setTimeout(200);
    assert(existsSync(metrics), 'Command did not finish within 120 s');
    const row = JSON.parse(readFileSync(metrics, 'utf8').trim());
    assert.equal(row.exitCode, 0);
    assert.equal(row.cancelled, false);
    assert.equal(row.bytes, input.length);
    await setTimeout(300);
    assert.equal(hash(readFileSync(row.fullOutputPath)), inputHash);
    const screen = tmux('capture-pane', '-t', name, '-p');
    writeFileSync(join(runDir, 'screen.txt'), screen);
    const normalized = screen.replaceAll(row.fullOutputPath, '<full-output>').replaceAll(/pi-bash-[a-f0-9]+\.log/g, '<output.log>');
    if (referenceScreen === undefined) referenceScreen = normalized;
    else assert.equal(normalized, referenceScreen, 'Final screens differ');
    unlinkSync(row.fullOutputPath);
    delete row.fullOutputPath;
    row.outputHash = inputHash;
    row.screenEqual = true;
    writeFileSync(join(runDir, 'metrics.jsonl'), JSON.stringify(row) + '\n');
    console.log(JSON.stringify(row));
  } finally {
    tmux('kill-session', '-t', name);
  }
}
writeFileSync(join(destination, 'runs.jsonl'), sequence.map((_, index) => readFileSync(join(destination, String(index + 1), 'metrics.jsonl'), 'utf8')).join(''));
console.log(execFileSync(process.execPath, [join(root, 'scripts/summarize.mjs'), join(destination, 'runs.jsonl')], { encoding: 'utf8' }));
