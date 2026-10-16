# Contributing to promql-validator

## Dev setup

```bash
npm install
npm run build       # builds every workspace package
npm test            # runs the full vitest suite (core + react)
npm run typecheck   # tsc --noEmit across every package
```

This is an npm-workspaces monorepo (`packages/core`, `packages/react`, `packages/meta`, `packages/monaco`, `packages/codemirror`) — no separate bootstrap step needed beyond `npm install` at the repo root.

## Adding a PromQL function to the built-in dictionary

Edit `packages/core/src/suggestions/builtins/functions.ts` (or `aggregations.ts` for aggregation operators). Each entry needs `minArgs`/`maxArgs` (used by the validator's arity check) and, for functions whose first argument must be a range vector, `rangeVectorArg: true`. Add a matching case to `packages/core/src/__tests__/validate.test.ts` if the function has a non-obvious arity rule.

Dictionary/grammar-coverage changes are tracked in `CHANGELOG-GRAMMAR.md`, separate from the package's own `CHANGELOG.md` — they're additive data changes, not API breaking changes.

## Adding a test case

- Parser/validator/formatter/suggestion-engine behavior → `packages/core/src/__tests__/`.
- `<PromQLInput/>` behavior → `packages/react/src/__tests__/`.
- A new "incomplete, mid-typing" query shape → add it to `validate.test.ts`'s incomplete-states list AND confirm it doesn't emit an error diagnostic.
- A new invalid-query case → add it with its expected `DiagnosticCode`.

## Code style

- Strict TypeScript, no unexplained `any`.
- `pipelines`/deterministic logic (`packages/core`) never imports from `packages/react`.
- Prefer a small, well-tested internal implementation over adding a runtime dependency — see "Dependency Strategy" reasoning in the project's PRD.

## Performance and bundle-size gates

CI enforces two things beyond tests, both of which you can (and should) run locally before opening a PR:

- **Bundle size** — `npm run build && npm run size` checks every published package's gzipped output against the budgets in `.size-limit.json`. If your change legitimately needs more room, raise the specific budget in that file as part of the PR and explain why in the description — don't raise it speculatively.
- **Performance** — `npm run build --workspace=packages/core && npm run benchmark:check` compares validation/suggestion latency against the committed baseline in `scripts/benchmark-baseline.json`. A run is only flagged as a regression when it's both >5x slower *and* >1ms slower in absolute terms than the baseline, since sub-millisecond timings are naturally noisy — so a flagged run is a real signal, not jitter. If your change intentionally trades latency for something else (or is a genuine, verified perf improvement), update the baseline in the same PR:
  ```bash
  npm run build --workspace=packages/core
  npm run benchmark:write-baseline
  ```
  and explain the tradeoff in the PR description. Never update the baseline just to make a failing check pass without understanding why it regressed first.

## Pull requests

Please include: what changed and why, test coverage for the change, and a one-line bundle-size impact note if you touched `packages/core` or `packages/react`'s runtime code.
