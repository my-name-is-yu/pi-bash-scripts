import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
assert(file, 'Usage: node scripts/summarize.mjs measurements/runs.jsonl');
const rows = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
const summary = {};
for (const mode of ['original', 'fast']) {
  const selected = rows.filter(row => row.mode === mode);
  if (!selected.length) continue;
  assert(selected.every(row => row.exitCode === 0 && row.cancelled === false));
  summary[mode] = { runs: selected.length };
  for (const key of ['elapsedMs', 'callbackMs']) {
    assert(selected.every(row => Number.isFinite(row[key]) && row[key] >= 0));
    summary[mode][`${key}Mean`] = selected.reduce((sum, row) => sum + row[key], 0) / selected.length;
  }
}
console.log(JSON.stringify(summary, null, 2));
