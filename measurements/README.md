# Historical measurements

`runs.jsonl` contains the ten accepted measurements collected on 2026-09-09. Timing fields are unchanged; machine-specific full-output paths were removed. `start` is the first append's `performance.now()` timestamp in that process, not wall-clock time. `run` is global execution order; `fast` denotes the bounded display-tail prototype.

Environment: macOS, Node v22.23.1, pi HEAD `aa23e784c647d713e775a8adcaf3c219e84f5068`, 100×32 tmux. Original and prototype alternated for five pairs, with a fresh pi process each time. Extensions were disabled and no model requests were sent.

Input: 25,743,261 bytes captured once with `rg --sort path --no-heading --line-number . packages -g '*.ts'`, then replayed via manual `!cat`. Every accepted run received 393 chunks. Input SHA-256:

```text
67839a57a79c81d6e16369852ccbee088ed3501b661f01c5ae195b93b2fba6d9
```

All ten saved output files matched that hash. Final tmux screen captures matched after normalizing the random log filename. These assertions were made during the historical run; the source-output fixture and machine-specific screen captures are not published here. A fresh clean checkout may produce a different fixture size and hash.

The historical checkout contained pre-existing uncommitted changes outside the target component. The target `bash-execution.ts` matched Git blob `b46a9d0b96fb40d2065ee4da67d6247e890b9d66`, also verified against upstream at the time. The timings therefore describe that local workspace, not a verified pristine build of the entire revision. The runner records whether a new checkout is dirty in `environment.json`.

## Timing boundaries

- `elapsedMs`: first `appendOutput()` entry until the wrapped `setComplete()` returns.
- `callbackMs`: sum of time inside the selected `appendOutput()` implementation.
- `maxCallbackMs`: largest individual append duration.
- Startup, time before first output, and the final terminal write after `setComplete()` are not included. Input latency was not measured.
- Instrumentation overhead is present in both variants. The same hooks were used; only the append/display implementation differed.

Two preliminary runs had a startup-readiness race, causing startup messages to affect the screen comparison. They were excluded before restarting all five pairs with an explicit init-completion signal. No accepted measurement was excluded for being fast or slow.

## Recalculate

```sh
node scripts/summarize.mjs measurements/runs.jsonl
```

The portable scripts in this repository were adapted from the original local harness. They regenerate the input from the selected checkout and use fresh isolated settings. They preserve the timing boundaries, prototype changes, run order, and readiness signal. New measurements are saved separately under `.work/` and must not be presented as the historical ten runs.
