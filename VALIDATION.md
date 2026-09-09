# Packaging validation

Checked on 2026-09-09 using Node v22.23.1 on macOS and an already prepared pi checkout.

- The documented upstream commit is publicly available on GitHub.
- `prepare.mjs` verified the revision and target component's blob.
- `git apply --check prototype.patch` passed against pi; no patch was applied to the checkout.
- The portable runner completed one original/prototype pair through real tmux TUI sessions: 8248.239 ms / 787.066 ms from first output to completion handling. Both produced identical full-output hashes and final screen text. These are packaging smoke results, not replacements for the five-run historical averages.
- The portable parity check passed all 42 inputs / 756 comparisons.
- Recomputing historical means from `measurements/runs.jsonl` reproduced the table in README.
- Public files contain no machine-specific home directory, temporary log path, credentials, or captured source-output fixture. Generated paths, local settings, and newly captured output stay under ignored `.work/`.

Not validated: a fresh dependency installation/build, Linux execution, or complete production-patch regression coverage. The historical dirty-checkout limitation is documented in `measurements/README.md`.
