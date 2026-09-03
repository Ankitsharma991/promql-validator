# Contributing to promql-validator

## Dev setup

```bash
npm install
npm run build       # builds every workspace package
npm test            # runs the full vitest suite (core + react)
npm run typecheck   # tsc --noEmit across every package
```

This is an npm-workspaces monorepo (`packages/core`, `packages/react`, `packages/meta`) — no separate bootstrap step needed beyond `npm install` at the repo root.

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

## Pull requests

Please include: what changed and why, test coverage for the change, and a one-line bundle-size impact note if you touched `packages/core` or `packages/react`'s runtime code.
