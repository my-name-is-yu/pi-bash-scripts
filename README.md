# Manual bash output in pi: reproduction and measurements

Manual `!` / `!!` output repeatedly joins and scans the full output history, even after the displayed tail reaches its limit. This repository contains a small prototype and measurements for that specific path.

| Mean of 5 historical TUI runs | Current | Bounded-tail prototype |
|---|---:|---:|
| First output → `setComplete()` return | 8.125 s | 0.799 s |
| Cumulative `appendOutput()` time | 7.403 s | 0.124 s |

[Raw measurements](measurements/runs.jsonl) · [Method and limitations](measurements/README.md) · [Prototype diff](prototype.patch)

## Requirements

- macOS or Linux with Node.js ≥22.19, Git, `rg`, and `tmux`. Tested on macOS with Node v22.23.1; Linux is not yet verified.
- A prepared pi source checkout at [aa23e784c647d713e775a8adcaf3c219e84f5068](https://github.com/earendil-works/pi/commit/aa23e784c647d713e775a8adcaf3c219e84f5068), with dependencies installed and workspace packages built.
- No dependencies need to be installed in this reproduction repository. Scripts use Node built-ins and pi's existing `tsx` installation.

For a separate pi checkout, a setup sequence is:

```sh
git clone https://github.com/earendil-works/pi.git ../pi
git -C ../pi checkout aa23e784c647d713e775a8adcaf3c219e84f5068
cd ../pi
npm ci --ignore-scripts
npm run build:offline
```

The reproduction was verified against an already prepared checkout; the fresh dependency-install/build sequence has not been independently validated here.

## Reproduce without the prototype

From that pi checkout, launch its source CLI, not an unrelated globally installed `pi`:

```sh
PI_CODING_AGENT_DIR="$(mktemp -d)" ./pi-test.sh --no-env \
  --no-session --no-extensions --no-skills --no-prompt-templates
```

Choose **Do not trust** if prompted, wait for startup, then enter:

```text
!rg --sort path --no-heading --line-number . packages -g '*.ts'
```

The amount of source output depends on the checkout. This demonstrates the current behavior without applying a patch or contacting a model.

## Measure

From this reproduction repository:

```sh
node scripts/prepare.mjs ../pi
node scripts/run.mjs original 1  # current implementation only
node scripts/run.mjs compare 5   # original, fast, repeated five times
```

`prepare` checks the revision and target component's Git blob, then generates runtime files under ignored `.work/`. It does not modify pi. `run` launches pi's source CLI in fresh 100×32 tmux sessions, with isolated settings and extensions disabled. It refuses project trust and sends only the manual shell command. Pi may download its managed `fd`/`rg` binaries during startup; startup is outside the timing interval.

Each batch captures sorted `rg` output once and replays that same file through `!cat`. The script waits for `InteractiveMode.init()` to finish before submission. It verifies full-output hashes and final screen text across runs, normalizing the random log filename. A mismatch fails the run. Only sessions created by the script are closed.

Results and screen captures go under `.work/run-*/`. Recalculate the published averages with:

```sh
node scripts/summarize.mjs measurements/runs.jsonl
```

## What changes in the prototype?

[The diff](prototype.patch) adds a display-only tail, retaining at most `2 * DEFAULT_MAX_BYTES` UTF-16 code units, and uses it instead of joining the full history during display updates. Full-output storage and `getOutput()` remain unchanged. The runner applies these methods only inside the test process.

For equal-sized chunks, the original rescans `1 + 2 + … + n` chunks' worth of output, giving O(n²) cumulative work. The prototype processes each new chunk plus a fixed-size tail, giving O(n) total work with fixed display limits. It does not make total output storage bounded.

The prototype is an experiment, not a fully validated production patch. A deterministic parity check covers 42 inputs and 756 rendered comparisons:

```sh
node scripts/check-parity.mjs
```

## Related work

[#4145](https://github.com/earendil-works/pi/issues/4145) was addressed by [#4165](https://github.com/earendil-works/pi/pull/4165) for the model-invoked bash tool. That PR did not change the separate manual bash display component examined here.
