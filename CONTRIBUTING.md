# Contributing

Thanks for helping out! Bug reports, failing queries, docs fixes and pull requests are all welcome.

## Setup

```bash
git clone https://github.com/Ankitsharma991/promql-validator.git
cd promql-validator
npm install
npm run build       # builds every package (the React package imports core's build output)
npm test            # vitest: unit, component, conformance, accessibility
```

Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit in every package
npm run lint
npm run size        # bundle size budgets (.size-limit.json)
npm run e2e         # Playwright against examples/vite-react-ts
npm run benchmark   # latency numbers
npm run docs:dev    # docs site on localhost
npm run dev --workspace=examples/vite-react-ts
```

It's an npm-workspaces monorepo:

```
packages/core        @promql-validator/core        parser, validator, formatter, suggestions
packages/react       @promql-validator/react       <PromQLInput/>
packages/meta        promql-validator              re-export + CLI
packages/monaco      @promql-validator/monaco
packages/codemirror  @promql-validator/codemirror
```

## Reporting a wrong validation result

Open an issue with the exact query, what Prometheus says about it (`promtool` or the Prometheus UI) and what this package says. A fix always comes with a new line in `packages/core/conformance/promql.json`.

## Common changes

**Add or update a PromQL function**: edit `packages/core/src/suggestions/builtins/functions.ts`. Each entry needs `minArgs`/`maxArgs`, `rangeVectorArg` (plus `rangeVectorArgIndex` if the range vector isn't the first argument), a `detail` signature and a one-line `description`. Mark feature-flagged functions `experimental: true`. Add a valid and an invalid query to the conformance corpus and a line to `CHANGELOG-GRAMMAR.md`.

**Add observability vocabulary**: edit `packages/core/src/suggestions/builtins/monitoring.ts`. Keep entries to names that are genuinely common across deployments.

**Grammar changes**: the lexer is `packages/core/src/lexer/tokenizer.ts` and the parser is `packages/core/src/parser/parser.ts`. Keep the two failure modes apart: running out of input is *incomplete* (no diagnostic); a wrong token is an *error*.

**Editor changes**: `packages/react/src`. Run the accessibility tests (`a11y.test.tsx`) and check the result in a browser (the Vite example) in light and dark mode.

## Tests

- Core behaviour: `packages/core/src/__tests__/`, plus the corpus in `packages/core/conformance/promql.json`.
- Component behaviour: `packages/react/src/__tests__/`. Use `userEvent.keyboard()` to type at the caret; note that user-event treats `[` and `{` as special characters, so a literal `[` is written `[[`.
- Adapters: each adapter has a parity test checking it reports the same diagnostics and suggestions as core.

## Code style

- Strict TypeScript, no `any` without a reason.
- `packages/core` never imports from the UI packages, and the adapters never re-implement parsing or ranking. They call core.
- No new runtime dependencies without discussing it in an issue first.
- Comments explain *why*; the code should explain *what*.

## Bundle size and performance

CI fails if a package grows past its budget in `.size-limit.json` or if latency regresses against `scripts/benchmark-baseline.json` (only when a run is both more than 5x slower and more than 1 ms slower, so noise doesn't trip it). If a change legitimately needs more room or trades speed for something else, update the budget or baseline (`npm run benchmark:write-baseline`) in the same pull request and explain why.

## Pull requests

1. Branch from `main`.
2. Add tests for the change.
3. If it changes published behaviour, add a changeset: `npm run changeset`.
4. Make sure `npm test`, `npm run typecheck`, `npm run lint` and `npm run size` pass.

By contributing you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
